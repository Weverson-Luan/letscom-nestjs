import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PassportModule } from '@nestjs/passport';
import { FeatureGateService } from '../auth/feature-gate.service';
import { FeaturesGuard } from './features.guard';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtStrategy } from './jwt.strategy';
import { RolesGuard } from './roles.guard';

/**
 * Registra a estratégia JWT e ativa os guards globais (executados nesta ordem):
 * - JwtAuthGuard: todas as rotas exigem JWT, exceto @Public()
 * - RolesGuard: aplica @Roles() quando presente
 * - FeaturesGuard: aplica @RequireFeatures() quando presente
 */
@Global()
@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  providers: [
    JwtStrategy,
    FeatureGateService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: FeaturesGuard },
  ],
  exports: [PassportModule, FeatureGateService],
})
export class SecurityModule {}
