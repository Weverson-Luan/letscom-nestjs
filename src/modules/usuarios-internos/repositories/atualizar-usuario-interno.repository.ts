/**
 * IMPORTS
 */
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

// shared
import { PrismaService } from 'src/shared/prisma/prisma.service';

@Injectable()
export class AtualizarUsuarioInternoRepository {
  constructor(private readonly prisma: PrismaService) {}

  atualizar(
    id: bigint,
    dadosAtualizacao: Prisma.UserUpdateInput,
    transacao?: Prisma.TransactionClient,
  ) {
    return (transacao ?? this.prisma).user.update({ where: { id }, data: dadosAtualizacao });
  }
}
