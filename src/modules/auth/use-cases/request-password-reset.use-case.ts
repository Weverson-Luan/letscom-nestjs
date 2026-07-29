import { Injectable } from '@nestjs/common';
import { BusinessException } from 'src/shared/exceptions/business.exception';
import { PasswordResetService } from '../services/password-reset.service';

/**
 * Espelha PasswordResetController::requestReset. Observação de fidelidade:
 * erros de validação e de negócio retornam HTTP 200 com `code` no corpo
 * (comportamento original do Laravel).
 */
@Injectable()
export class RequestPasswordResetUseCase {
  constructor(private readonly service: PasswordResetService) {}

  async execute(body: Record<string, any>): Promise<{ status: number; body: any }> {
    const email = body?.email;

    const emailValido =
      typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (!email) {
      return {
        status: 200,
        body: {
          code: 422,
          message: 'Erro de validação dos dados informados!',
          errors: { email: ['O e-mail é obrigatório.'] },
        },
      };
    }
    if (!emailValido) {
      return {
        status: 200,
        body: {
          code: 422,
          message: 'Erro de validação dos dados informados!',
          errors: { email: ['Informe um e-mail válido.'] },
        },
      };
    }

    try {
      await this.service.requestReset(email);
      return { status: 200, body: { code: 200, message: 'E-mail enviado com sucesso!' } };
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
