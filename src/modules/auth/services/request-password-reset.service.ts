import { Injectable } from '@nestjs/common';
import { BusinessException } from 'src/shared/exceptions/business.exception';
import { AuthResetPasswordService } from '../services/auth-reset-password.service';
import { requestResetPasswordMappers } from './helpers/request-reset-password';
import { PasswordResetRepository } from '../repositories/password-reset.repository';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { MailService } from 'src/shared/mail/mail.service';
import { ConfigService } from '@nestjs/config';

// function requestReset(email: string): Promise<boolean> {
//   let nome: string | null = null;

//   const user = await this.prisma.user.findUnique({ where: { email } });
//   if (user) {
//     nome = user.nome;
//   } else {
//     const userCliente = await this.prisma.userCliente.findUnique({ where: { email } });
//     if (!userCliente) {
//       throw new BusinessException('E-mail não encontrado!');
//     }
//     nome = userCliente.nome;
//   }

//   const token = this.randomToken(60);
//   await this.repository.createToken(email, token);

//   const frontendUrl = this.config.get<string>('app.frontendUrl');
//   const link = `${frontendUrl}/reset-password-confirm?token=${token}`;

//   try {
//     const html = this.mail.render('reset-password', {
//       link,
//       user: { nome: nome ?? 'Usuário' },
//       year: new Date().getFullYear(),
//     });

//     await this.mail.send({
//       to: email,
//       toName: nome ?? 'Usuário',
//       subject: 'Redefinir senha',
//       html,
//       text: `Copie e cole no navegador: ${link}`,
//     });
//   } catch (error) {
//     throw new BusinessException((error as Error).message);
//   }

//   return true;
// }

/**
 * Espelha PasswordResetController::requestReset. Observação de fidelidade:
 * erros de validação e de negócio retornam HTTP 200 com `code` no corpo
 * (comportamento original do Laravel).
 */
@Injectable()
export class RequestPasswordResetUseCase {
  constructor(
    private readonly service: AuthResetPasswordService,
    private readonly prisma: PrismaService,
    private readonly repository: PasswordResetRepository,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  async execute(body: Record<string, any>): Promise<{ status: number; body: any }> {
    const email = body?.email;

    const emailValido = typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

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
      await requestResetPasswordMappers(
        this.repository,
        this.prisma,
        this.config,
        this.mail,
        email,
      );

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
