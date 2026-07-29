import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import configuration from './config/configuration';
import { validateEnv } from './config/env.validation';
import { AuthModule } from './modules/auth/auth.module';
import { CreditSalesModule } from './modules/credit-sales/credit-sales.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { EnderecosModule } from './modules/enderecos/enderecos.module';
import { FeatureFlagsModule } from './modules/feature-flags/feature-flags.module';
import { HealthModule } from './modules/health/health.module';
import { ModelosTecnicosModule } from './modules/modelos-tecnicos/modelos-tecnicos.module';
import { ProductsModule } from './modules/products/products.module';
import { RemessaLiberacaoModule } from './modules/remessa-liberacao/remessa-liberacao.module';
import { RemessasModule } from './modules/remessas/remessas.module';
import { RolesModule } from './modules/roles/roles.module';
import { TecnologiasModule } from './modules/tecnologias/tecnologias.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { UsersModule } from './modules/users/users.module';
import { UsuariosClienteModule } from './modules/usuarios-cliente/usuarios-cliente.module';
import { CacheModule } from './shared/cache/cache.module';
import { SecurityModule } from './shared/guards/security.module';
import { LoggingInterceptor } from './shared/interceptors/logging.interceptor';
import { MailModule } from './shared/mail/mail.module';
import { PrismaModule } from './shared/prisma/prisma.module';
import { StorageModule } from './shared/storage/storage.module';
import { UtilsModule } from './shared/utils/utils.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
    }),
    // Rate limit global: 50 req/min (espelha o RateLimiter::for('api') do Laravel)
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 50 }]),
    // Infraestrutura compartilhada (todos @Global)
    PrismaModule,
    CacheModule,
    StorageModule,
    MailModule,
    UtilsModule,
    SecurityModule,
    // Módulos de domínio
    HealthModule,
    AuthModule,
    UsersModule,
    RemessasModule,
    RemessaLiberacaoModule,
    UploadsModule,
    DashboardModule,
    RolesModule,
    FeatureFlagsModule,
    TecnologiasModule,
    ProductsModule,
    CreditSalesModule,
    ModelosTecnicosModule,
    EnderecosModule,
    UsuariosClienteModule,
  ],
  providers: [{ provide: APP_INTERCEPTOR, useClass: LoggingInterceptor }],
})
export class AppModule {}
