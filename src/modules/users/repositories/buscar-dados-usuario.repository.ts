/**
 * IMPORTS
 */
import { Injectable } from '@nestjs/common';

// shared
import { PrismaService } from 'src/shared/prisma/prisma.service';

const STATUS_REMESSA_ENCERRADA = ['concluida', 'concluído', 'cancelada'];

@Injectable()
export class BuscarDadosUsuarioRepository {
  constructor(private readonly prisma: PrismaService) {}

  contarRemessasEmAndamento(clienteId: bigint) {
    return this.prisma.remessa.count({
      where: { clienteId, status: { notIn: STATUS_REMESSA_ENCERRADA } },
    });
  }

  contarRemessasProduzidas(clienteId: bigint) {
    return this.prisma.remessa.count({ where: { clienteId, status: 'pedido_liberado' } });
  }
}
