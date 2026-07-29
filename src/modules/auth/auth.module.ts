import { Module } from '@nestjs/common';
import { AuthController } from './controllers/auth.controller';
import { PasswordResetController } from './controllers/password-reset.controller';
import { PasswordResetRepository } from './repositories/password-reset.repository';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
import { JwtTokenService } from './services/jwt-token.service';
import { PasswordResetService } from './services/password-reset.service';
import { RefreshTokenService } from './services/refresh-token.service';
import { LoginUseCase } from './use-cases/login.use-case';
import { LogoutUseCase } from './use-cases/logout.use-case';
import { RefreshTokenUseCase } from './use-cases/refresh-token.use-case';
import { RequestPasswordResetUseCase } from './use-cases/request-password-reset.use-case';
import { ResetPasswordUseCase } from './use-cases/reset-password.use-case';

@Module({
  controllers: [AuthController, PasswordResetController],
  providers: [
    // services
    JwtTokenService,
    RefreshTokenService,
    PasswordResetService,
    // repositories
    RefreshTokenRepository,
    PasswordResetRepository,
    // use-cases
    LoginUseCase,
    RefreshTokenUseCase,
    LogoutUseCase,
    RequestPasswordResetUseCase,
    ResetPasswordUseCase,
  ],
  exports: [JwtTokenService, RefreshTokenService],
})
export class AuthModule {}
