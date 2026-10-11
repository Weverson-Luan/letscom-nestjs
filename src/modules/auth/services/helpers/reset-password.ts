import { BusinessException } from "src/shared/exceptions/business.exception";

import * as bcrypt from 'bcrypt';

async function  resetPassword(
  repository: any, prisma: any, token: string, novaSenha: string
): Promise<boolean> {
  const tokenData = await repository.findToken(token);

  if (!tokenData) {
    throw new BusinessException('Token inválido ou expirado!');
  }

  const createdAt = tokenData.createdAt ?? new Date(0);
  const diffMinutes = (Date.now() - createdAt.getTime()) / 60000;
  if (diffMinutes > 60) {
    throw new BusinessException('Token expirado!');
  }

  const user = await prisma.user.findUnique({ where: { email: tokenData.email } });
  if (!user) {
    throw new Error('Usuário não encontrado!');
  }



  await prisma.user.update({
    where: { id: user.id },
    data: { senha: await bcrypt.hash(novaSenha, 12) },
  });

  await repository.deleteToken(user.email);

  return true;
}


/**
 * EXPORTS
 */
export {
  resetPassword
}