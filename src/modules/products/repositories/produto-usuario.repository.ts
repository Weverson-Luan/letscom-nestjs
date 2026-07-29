import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/shared/prisma/prisma.service';

@Injectable()
export class ProdutoUsuarioRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUser(id: bigint) {
    return this.prisma.user.findFirst({ where: { id, deletedAt: null } });
  }

  findProduct(id: bigint) {
    return this.prisma.product.findFirst({ where: { id, deletedAt: null } });
  }

  findVinculo(clienteId: bigint, produtoId: bigint) {
    return this.prisma.produtoUsuario.findUnique({
      where: {
        clienteId_produtoId: { clienteId, produtoId },
      },
    });
  }

  vincular(clienteId: bigint, produtoId: bigint) {
    return this.prisma.produtoUsuario.upsert({
      where: {
        clienteId_produtoId: { clienteId, produtoId },
      },
      create: { clienteId, produtoId },
      update: {},
    });
  }

  desvincular(clienteId: bigint, produtoId: bigint) {
    return this.prisma.produtoUsuario.deleteMany({
      where: { clienteId, produtoId },
    });
  }

  listarPorCliente(clienteId: bigint) {
    return this.prisma.produtoUsuario.findMany({
      where: { clienteId },
      include: { produto: true },
      orderBy: { id: 'asc' },
    });
  }
}
