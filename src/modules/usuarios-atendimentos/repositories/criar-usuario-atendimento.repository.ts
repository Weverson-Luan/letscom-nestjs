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
export class CriarUsuarioAtendimentoRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Usuário dono do atendimento, ignorando os excluídos (soft delete). */
  buscarUsuarioNaoExcluido(usuarioId: bigint) {
    return this.prisma.user.findFirst({ where: { id: usuarioId, deletedAt: null } });
  }

  criar(dadosCriacao: Prisma.UserAtendimentoCreateInput, transacao?: Prisma.TransactionClient) {
    return (transacao ?? this.prisma).userAtendimento.create({
      data: dadosCriacao,
      include: INCLUIR_USUARIO_DONO,
    });
  }
}
