import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/shared/prisma/prisma.service';

@Injectable()
export class PasswordResetRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Cria/atualiza o token de reset para o e-mail (updateOrCreate do Laravel). */
  createToken(email: string, token: string) {
    return this.prisma.passwordResetToken.upsert({
      where: { email },
      update: { token, createdAt: new Date() },
      create: { email, token, createdAt: new Date() },
    });
  }

  findToken(token: string) {
    return this.prisma.passwordResetToken.findFirst({ where: { token } });
  }

  deleteToken(email: string) {
    return this.prisma.passwordResetToken.deleteMany({ where: { email } });
  }
}
