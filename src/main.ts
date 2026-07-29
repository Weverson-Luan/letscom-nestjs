import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { WinstonModule } from 'nest-winston';
import { join } from 'path';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './shared/filters/all-exceptions.filter';
import { createWinstonOptions } from './shared/utils/logger';

// Serializa BigInt (ids BIGINT UNSIGNED do Prisma) como número no JSON,
// espelhando os ids numéricos das respostas do Laravel.
(BigInt.prototype as unknown as { toJSON: () => number }).toJSON = function () {
  return Number(this as unknown as bigint);
};

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: WinstonModule.createLogger(
      createWinstonOptions(process.env.LOG_LEVEL ?? 'debug'),
    ),
  });

  const config = app.get(ConfigService);
  const context = config.get<string>('app.context') ?? 'apiparcelas';
  const port = config.get<number>('app.port') ?? 3000;
  const maxUpload = config.get<number>('app.maxUploadSize') ?? 209715200;

  // Prefixo global de rota (compatibilidade com o APP_CONTEXT do Laravel)
  app.setGlobalPrefix(context);

  // Espelha o symlink public/storage do Laravel: arquivos em storage/app
  // ficam acessíveis em /storage/<path> (fora do APP_CONTEXT).
  app.useStaticAssets(join(process.cwd(), 'storage', 'app'), {
    prefix: '/storage/',
  });

  // Limite de body/upload (200MB, igual ao PHP upload_max_filesize)
  app.useBodyParser('json', { limit: maxUpload });
  app.useBodyParser('urlencoded', { limit: maxUpload, extended: true });

  app.enableCors({ origin: true, credentials: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  // Swagger em /{context}/docs
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Letscom API (NestJS)')
    .setDescription('Migração do backend Laravel — gestão de créditos e remessas')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${context}/docs`, app, document);

  await app.listen(port);
}

bootstrap();
