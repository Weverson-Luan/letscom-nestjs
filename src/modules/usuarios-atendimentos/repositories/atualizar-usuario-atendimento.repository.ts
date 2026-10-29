/**
 * IMPORTS
 */
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

// shared
import { PrismaService } from 'src/shared/prisma/prisma.service';

// seleção do usuário dono (sem senha)
import { INCLUIR_USUARIO_DONO } from '../usuarios-atendimentos.constants';

@Injectable()
export class AtualizarUsuarioAtendimentoRepository {
  constructor(private readonly prisma: PrismaService) {}

  buscarPorId(id: bigint) {
    return this.prisma.userAtendimento.findUnique({ where: { id } });
  }

  atualizar(
    id: bigint,
    dadosAtualizacao: Prisma.UserAtendimentoUpdateInput,
    transacao?: Prisma.TransactionClient,
  ) {
    return (transacao ?? this.prisma).userAtendimento.update({
      where: { id },
      data: dadosAtualizacao,
      include: INCLUIR_USUARIO_DONO,
    });
  }
}
