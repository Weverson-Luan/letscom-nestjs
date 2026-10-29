/**
 * IMPORTS
 */
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

// shared
import { PrismaService } from 'src/shared/prisma/prisma.service';

@Injectable()
export class ExcluirUsuarioAtendimentoRepository {
  constructor(private readonly prisma: PrismaService) {}

  buscarPorId(id: bigint) {
    return this.prisma.userAtendimento.findUnique({ where: { id } });
  }

  /** Exclusão física (users_atendimentos não tem soft delete). */
  excluir(id: bigint, transacao?: Prisma.TransactionClient) {
    return (transacao ?? this.prisma).userAtendimento.delete({ where: { id } });
  }
}
