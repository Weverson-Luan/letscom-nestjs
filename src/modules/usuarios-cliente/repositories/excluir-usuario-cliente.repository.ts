/**
 * IMPORTS
 */
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

// shared
import { PrismaService } from 'src/shared/prisma/prisma.service';

@Injectable()
export class ExcluirUsuarioClienteRepository {
  constructor(private readonly prisma: PrismaService) {}

  buscarPorId(id: bigint) {
    return this.prisma.userCliente.findUnique({ where: { id } });
  }

  contarRemessasDoSubordinado(id: bigint) {
    return this.prisma.remessa.count({ where: { usersSolicitanteSubordinadoId: id } });
  }

  /** Exclusão física (users_cliente não tem soft delete). */
  excluir(id: bigint, transacao?: Prisma.TransactionClient) {
    return (transacao ?? this.prisma).userCliente.delete({ where: { id } });
  }
}
