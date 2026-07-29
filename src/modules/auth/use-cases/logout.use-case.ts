import { Injectable } from '@nestjs/common';
import { AuthUser } from 'src/shared/decorators/current-user.decorator';
import { RefreshTokenService } from '../services/refresh-token.service';

/** Espelha AuthController::logout (revoga todos os refresh tokens do usuário). */
@Injectable()
export class LogoutUseCase {
  constructor(private readonly refreshTokenService: RefreshTokenService) {}

  async execute(user: AuthUser | undefined) {
    if (user) {
      await this.refreshTokenService.revokeAll(
        user.tipoLogin === 'subordinado'
          ? {
              kind: 'subordinado',
              id: user.id,
              email: user.email,
              ativo: user.ativo,
              clienteId: user.clienteId ?? BigInt(0),
            }
          : { kind: 'user', id: user.id, email: user.email, ativo: user.ativo },
      );
    }

    return {
      code: 200,
      status: 'success',
      message: 'Logout realizado com sucesso!',
      data: [],
      pagination: null,
    };
  }
}
