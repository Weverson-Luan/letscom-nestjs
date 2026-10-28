/**
 * IMPORTS
 */
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

// shared
import { PrismaService } from 'src/shared/prisma/prisma.service';

@Injectable()
export class AtualizarUsuarioRepository {
  constructor(private readonly prisma: PrismaService) {}

  buscarPorId(id: bigint) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  atualizar(id: bigint, data: Prisma.UserUpdateInput, transacao?: Prisma.TransactionClient) {
    return (transacao ?? this.prisma).user.update({ where: { id }, data });
  }

  /** O cliente tem um único tipo de entrega: remove o vínculo atual e cria o novo. */
  async substituirTipoEntrega(
    clienteId: bigint,
    tipoEntregaId: bigint,
    transacao?: Prisma.TransactionClient,
  ) {
    const conexao = transacao ?? this.prisma;
    await conexao.tipoEntregaUser.deleteMany({ where: { clienteId } });
    await conexao.tipoEntregaUser.create({ data: { clienteId, tipoEntregaId } });
  }
}
