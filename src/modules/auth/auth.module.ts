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

// controolers
import { AuthController } from './controllers/auth.controller';
import { PasswordResetController } from './controllers/password-reset.controller';

// repositories
import { PasswordResetRepository } from './repositories/password-reset.repository';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';



@Module({
  controllers: [AuthController, PasswordResetController],
  providers: [
    // services
    JwtTokenService,
    RefreshTokenService,
    AuthResetPasswordService,
    RequestPasswordResetUseCase,
    // repositories
    RefreshTokenRepository,
    PasswordResetRepository,
    // use-cases
    AuthClientUserService,
    AuthSubordinateUserService,
  ],
  exports: [JwtTokenService, RefreshTokenService],
})
export class AuthModule {}
