import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { RefreshTokenService } from '../services/refresh-token.service';

/** Espelha AuthController::refresh (rotação de refresh token). */
@Injectable()
export class RefreshTokenUseCase {
  constructor(private readonly refreshTokenService: RefreshTokenService) {}

  async execute(refreshToken: string) {
    try {
      const result = await this.refreshTokenService.rotate(refreshToken);
      return {
        access_token: result.access_token,
        refresh_token: result.refresh_token,
      };
    } catch {
      throw new HttpException(
        { code: 401, error: 'Refresh token inválido ou expirado' },
        HttpStatus.UNAUTHORIZED,
      );
    }
  }
}
