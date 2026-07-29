import { Injectable } from '@nestjs/common';
import { BusinessException } from 'src/shared/exceptions/business.exception';
import { PasswordResetService } from '../services/password-reset.service';

/**
 * Espelha PasswordResetController::resetPassword (validação: token,
 * senha min:6, nova_senha same:senha). Erros retornam HTTP 200 com `code`.
 */
@Injectable()
export class ResetPasswordUseCase {
  constructor(private readonly service: PasswordResetService) {}

  async execute(body: Record<string, any>): Promise<{ status: number; body: any }> {
    const errors = this.validate(body);
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
      await this.service.resetPassword(body.token, body.nova_senha);
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

  private validate(body: Record<string, any>): Record<string, string[]> {
    const errors: Record<string, string[]> = {};
    if (!body?.token) {
      errors.token = ['O token é obrigatório.'];
    }
    if (!body?.senha) {
      errors.senha = ['A senha antiga é obrigatória.'];
    } else if (String(body.senha).length < 6) {
      errors.senha = ['A senha deve ter pelo menos 6 caracteres.'];
    }
    if (!body?.nova_senha) {
      errors.nova_senha = ['A nova senha é obrigatória.'];
    } else if (body.nova_senha !== body.senha) {
      errors.nova_senha = ['As senhas não coincidem.'];
    }
    return errors;
  }
}
