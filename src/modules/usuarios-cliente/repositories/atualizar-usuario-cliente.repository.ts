/**
 * IMPORTS
 */
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

// shared
import { PrismaService } from 'src/shared/prisma/prisma.service';

@Injectable()
export class AtualizarUsuarioClienteRepository {
  constructor(private readonly prisma: PrismaService) {}

  buscarPorId(id: bigint) {
    return this.prisma.userCliente.findUnique({ where: { id } });
  }

  atualizar(
    id: bigint,
    dadosAtualizacao: Prisma.UserClienteUpdateInput,
    transacao?: Prisma.TransactionClient,
  ) {
    return (transacao ?? this.prisma).userCliente.update({ where: { id }, data: dadosAtualizacao });
  }
}
