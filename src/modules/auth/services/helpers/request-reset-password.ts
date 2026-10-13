/**
 * IMPORTS
 */

import { ConfigService } from "@nestjs/config";
import { BusinessException } from "src/shared/exceptions/business.exception";
import { handleRandomToken } from "src/shared/utils/random-token";
import { PasswordResetRepository } from "../../repositories/password-reset.repository";
import { PrismaService } from "src/shared/prisma/prisma.service";
import { MailService } from "src/shared/mail/mail.service";



async function requestResetPasswordMappers(
  repository: PasswordResetRepository, prisma: PrismaService, config: ConfigService, mail: MailService, email: string): Promise<boolean> {
  let nome: string | null = null;

  const user = await prisma.user.findUnique({ where: { email } });


  if (user) {
    nome = user.nome;

  } else {
    const userCliente = await prisma.userCliente.findUnique({ where: { email } });

    if (!userCliente) {
      throw new BusinessException('E-mail não encontrado!');
    }

    nome = userCliente.nome;
  }


  const token = handleRandomToken(60);
  await repository.createToken(email, token);

  const frontendUrl = config.get<string>('app.frontendUrl');

  const link = `${frontendUrl}/reset-password-confirm?token=${token}`;

  try {
    const html = mail.render('reset-password', {
      link,
      user: { nome: nome ?? 'Usuário' },
      year: new Date().getFullYear(),
    });

    await mail.send({
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


/**
 * EXPORTS
 */
export {requestResetPasswordMappers}