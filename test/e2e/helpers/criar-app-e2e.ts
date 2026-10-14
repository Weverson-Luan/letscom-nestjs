import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModuleBuilder } from '@nestjs/testing';
import { AppModule } from 'src/app.module';
import { AllExceptionsFilter } from 'src/shared/filters/all-exceptions.filter';

/** Mesmo prefixo global do main.ts (APP_CONTEXT). */
export const PREFIXO_API = `/${process.env.APP_CONTEXT ?? 'apiparcelas'}`;

/**
 * Sobe a aplicação completa para testes e2e com a mesma configuração do main.ts
 * (prefixo, ValidationPipe, filtro global e serialização de BigInt).
 *
 * `customizar` permite sobrescrever providers externos (mail, storage...) sem tocar no banco:
 *   criarAppE2e((b) => b.overrideProvider(MailService).useValue({ enviar: jest.fn() }))
 */
export async function criarAppE2e(
  customizar?: (builder: TestingModuleBuilder) => TestingModuleBuilder,
): Promise<INestApplication> {
  (BigInt.prototype as unknown as { toJSON: () => number }).toJSON = function () {
    return Number(this as unknown as bigint);
  };

  let builder = Test.createTestingModule({ imports: [AppModule] });
  if (customizar) builder = customizar(builder);

  const moduleRef = await builder.compile();
  const app = moduleRef.createNestApplication();

  app.setGlobalPrefix(PREFIXO_API.slice(1));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  await app.init();
  return app;
}
