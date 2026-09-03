/**
 * IMPORTS
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';

// config
import configuration from './config/configuration';
import { validateEnv } from './config/env.validation';

// modules
import { AuthModule } from './modules/auth/auth.module';
import { CreditSalesModule } from './modules/credit-sales/credit-sales.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { EnderecosModule } from './modules/enderecos/enderecos.module';
import { EnderecosEntregaModule } from './modules/enderecos-entrega/enderecos-entrega.module';
import { EntregasClienteModule } from './modules/entregas-cliente/entregas-cliente.module';
import { FeatureFlagsModule } from './modules/feature-flags/feature-flags.module';
import { HealthModule } from './modules/health/health.module';
import { ModelosTecnicosModule } from './modules/modelos-tecnicos/modelos-tecnicos.module';
import { ProductsModule } from './modules/products/products.module';
import { RemessaLiberacaoModule } from './modules/remessa-liberacao/remessa-liberacao.module';

// modules 
import { RemessasModule } from './modules/remessas/remessas.module';
import { RolesModule } from './modules/roles/roles.module';
import { UsersModule } from './modules/users/users.module';
import { UsuariosClienteModule } from './modules/usuarios-cliente/usuarios-cliente.module';
import { UsersAtendimentosModule } from './modules/users-atendimentos/users-atendimentos.module';
import { TecnologiasModule } from './modules/tecnologias/tecnologias.module';
import { TiposEntregaModule } from './modules/tipos-entrega/tipos-entrega.module';
import { TutorialsModule } from './modules/tutorials/tutorials.module';
import { UploadsModule } from './modules/uploads/uploads.module';

// shared / cache
import { CacheModule } from './shared/cache/cache.module';

// shared / guards
import { SecurityModule } from './shared/guards/security.module';

// shared / interceptors
import { LoggingInterceptor } from './shared/interceptors/logging.interceptor';

// shared / mail
import { MailModule } from './shared/mail/mail.module';

// shared / prisma
import { PrismaModule } from './shared/prisma/prisma.module';

// shared / storage
import { StorageModule } from './shared/storage/storage.module';

// shared / utils
import { UtilsModule } from './shared/utils/utils.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
    }),
    // Rate limit global: 50 req/min
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
    EnderecosEntregaModule,
    EntregasClienteModule,
    TiposEntregaModule,
    TutorialsModule,
    UsersAtendimentosModule,
    UsuariosClienteModule,
  ],
  providers: [{ provide: APP_INTERCEPTOR, useClass: LoggingInterceptor }],
})

/**
 * EXPORT
 */
export class AppModule {}
