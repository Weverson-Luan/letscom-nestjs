/**
 * IMPORTS
 */

import { Module } from '@nestjs/common';

// services
import { JwtTokenService } from './services/jwt-token.service';
import { AuthResetPasswordService } from './services/auth-reset-password.service';
import { RefreshTokenService } from './services/refresh-token.service';
import { AuthClientUserService } from './services/auth-client-user.service';
import { AuthSubordinateUserService } from './services/auth-subordinate-user.service';
import { RequestPasswordResetUseCase } from './services/request-password-reset.service';
import { GerarCodigoAcessoBackofficeService } from './services/gerar-codigo-acesso-backoffice.service';
import { TrocarCodigoAcessoBackofficeService } from './services/trocar-codigo-acesso-backoffice.service';
import { CodigoAcessoBackofficeCacheService } from './services/codigo-acesso-backoffice-cache.service';

// controolers
import { AuthController } from './controllers/auth.controller';
import { PasswordResetController } from './controllers/password-reset.controller';
import { AcessoBackofficeController } from './controllers/acesso-backoffice.controller';

// repositories
import { PasswordResetRepository } from './repositories/password-reset.repository';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
import { UsuarioInternoRepository } from './repositories/usuario-interno.repository';

@Module({
  controllers: [AuthController, PasswordResetController, AcessoBackofficeController],
  providers: [
    // services
    JwtTokenService,
    RefreshTokenService,
    AuthResetPasswordService,
    RequestPasswordResetUseCase,
    CodigoAcessoBackofficeCacheService,
    // repositories
    RefreshTokenRepository,
    PasswordResetRepository,
    UsuarioInternoRepository,
    // use-cases
    AuthClientUserService,
    AuthSubordinateUserService,
    GerarCodigoAcessoBackofficeService,
    TrocarCodigoAcessoBackofficeService,
  ],
  exports: [JwtTokenService, RefreshTokenService],
})
export class AuthModule {}
