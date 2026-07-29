import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/shared/prisma/prisma.service';

export const TOKENABLE_USER = 'App\\Models\\User';
export const TOKENABLE_SUBORDINADO = 'App\\Models\\UserCliente';

@Injectable()
export class RefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: {
    tokenableType: string;
    tokenableId: bigint;
    tokenHash: string;
    expiresAt: Date;
  }) {
    return this.prisma.refreshToken.create({ data });
  }

  findValidByHash(tokenHash: string) {
    return this.prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  }

  revokeById(id: bigint) {
    return this.prisma.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  revokeAll(tokenableType: string, tokenableId: bigint) {
    return this.prisma.refreshToken.updateMany({
      where: { tokenableType, tokenableId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
