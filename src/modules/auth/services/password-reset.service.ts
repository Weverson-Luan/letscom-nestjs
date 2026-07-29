import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { BusinessException } from 'src/shared/exceptions/business.exception';
import { MailService } from 'src/shared/mail/mail.service';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { HashService } from 'src/shared/utils/hash.service';
import { PasswordResetRepository } from '../repositories/password-reset.repository';

/**
 * Espelha o PasswordResetService do Laravel: token de 60 chars, expira em
 * 60 min; e-mail via MailerSend (template reset-password); reset atualiza a
 * senha do User (bcrypt).
 */
@Injectable()
export class PasswordResetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: PasswordResetRepository,
    private readonly mail: MailService,
    private readonly hash: HashService,
    private readonly config: ConfigService,
  ) {}

  private randomToken(length = 60): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const bytes = randomBytes(length);
    let out = '';
    for (let i = 0; i < length; i++) {
      out += chars[bytes[i] % chars.length];
    }
    return out;
  }

  async requestReset(email: string): Promise<boolean> {
    let nome: string | null = null;

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user) {
      nome = user.nome;
    } else {
      const userCliente = await this.prisma.userCliente.findUnique({ where: { email } });
      if (!userCliente) {
        throw new BusinessException('E-mail não encontrado!');
      }
      nome = userCliente.nome;
    }

    const token = this.randomToken(60);
    await this.repository.createToken(email, token);

    const frontendUrl = this.config.get<string>('app.frontendUrl');
    const link = `${frontendUrl}/reset-password-confirm?token=${token}`;

    try {
      const html = this.mail.render('reset-password', {
        link,
        user: { nome: nome ?? 'Usuário' },
        year: new Date().getFullYear(),
      });

      await this.mail.send({
        to: email,
        toName: nome ?? 'Usuário',
        subject: 'Redefinir senha',
        html,
        text: `Copie e cole no navegador: ${link}`,
      });
    } catch (error) {
      throw new BusinessException((error as Error).message);
    }

    return true;
  }

  async resetPassword(token: string, novaSenha: string): Promise<boolean> {
    const tokenData = await this.repository.findToken(token);

    if (!tokenData) {
      throw new BusinessException('Token inválido ou expirado!');
    }

    const createdAt = tokenData.createdAt ?? new Date(0);
    const diffMinutes = (Date.now() - createdAt.getTime()) / 60000;
    if (diffMinutes > 60) {
      throw new BusinessException('Token expirado!');
    }

    const user = await this.prisma.user.findUnique({ where: { email: tokenData.email } });
    if (!user) {
      throw new Error('Usuário não encontrado!');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { senha: await this.hash.make(novaSenha) },
    });

    await this.repository.deleteToken(user.email);

    return true;
  }
}
