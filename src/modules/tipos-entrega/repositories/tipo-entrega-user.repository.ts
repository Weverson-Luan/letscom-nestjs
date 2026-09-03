import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/shared/prisma/prisma.service';

@Injectable()
export class TipoEntregaUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  listByUser(userId: bigint) {
    return this.prisma.tipoEntregaUser.findMany({
      where: { clienteId: userId },
      include: { tipoEntrega: true },
    });
  }

  attach(clienteId: bigint, tipoEntregaId: bigint) {
    return this.prisma.tipoEntregaUser.create({
      data: { clienteId, tipoEntregaId },
      include: { tipoEntrega: true },
    });
  }

  replaceForUser(clienteId: bigint, tipoEntregaId: bigint) {
    return this.prisma.$transaction(async (tx) => {
      await tx.tipoEntregaUser.deleteMany({ where: { clienteId } });
      return tx.tipoEntregaUser.create({
        data: { clienteId, tipoEntregaId },
        include: { tipoEntrega: true },
      });
    });
  }
}
