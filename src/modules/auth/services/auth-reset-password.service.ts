/**
 * IMPORTS
 */

import { Injectable } from '@nestjs/common';

// services
import { PrismaService } from 'src/shared/prisma/prisma.service';

// repositories / password
import { PasswordResetRepository } from '../repositories/password-reset.repository';

// shared / exceptions
import { BusinessException } from 'src/shared/exceptions/business.exception';

// mappers
import { resetPassword } from './helpers/reset-password';
import { validateResetPasswordBody } from './helpers/validade.';

/**
 * Espelha PasswordResetController::resetPassword (validação: token,
 * senha min:6, nova_senha same:senha). Erros retornam HTTP 200 com `code`.
 */
@Injectable()
export class AuthResetPasswordService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: PasswordResetRepository,
  ) {}

  async execute(body: Record<string, any>): Promise<{ status: number; body: any }> {
    const errors = validateResetPasswordBody(body);

    if (Object.keys(errors).length > 0) {
      return {
        status: 200,
        body: {
          code: 422,
          message: 'Erro de validação dos dados informados!',
          errors,
        },
      };
    }

    try {
      await resetPassword(this.repository, this.prisma, body.token, body.nova_senha);

      return { status: 200, body: { code: 200, message: 'Senha alterada com sucesso!' } };
    } catch (error) {
      if (error instanceof BusinessException) {
        return {
          status: 200,
          body: {
            code: 422,
            message: 'Erro de validação!',
            errors: { message: error.message },
          },
        };
      }
      return {
        status: 500,
        body: {
          code: 500,
          message: 'Erro interno. Tente novamente mais tarde.',
          errors: { message: (error as Error).message },
        },
      };
    }
  }
}
