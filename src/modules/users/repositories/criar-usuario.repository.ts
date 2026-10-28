/**
 * IMPORTS
 */
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

// shared
import { PrismaService } from 'src/shared/prisma/prisma.service';

@Injectable()
export class CriarUsuarioRepository {
  constructor(private readonly prisma: PrismaService) {}

  criar(data: Prisma.UserCreateInput, transacao?: Prisma.TransactionClient) {
    return (transacao ?? this.prisma).user.create({ data });
  }

  vincularConsultor(clienteId: bigint, consultorId: bigint, transacao?: Prisma.TransactionClient) {
    return (transacao ?? this.prisma).clienteConsultor.create({ data: { clienteId, consultorId } });
  }

  vincularTipoEntrega(
    clienteId: bigint,
    tipoEntregaId: bigint,
    transacao?: Prisma.TransactionClient,
  ) {
    return (transacao ?? this.prisma).tipoEntregaUser.create({
      data: { clienteId, tipoEntregaId },
    });
  }
}
