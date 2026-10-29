/**
 * IMPORTS
 */
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

// shared
import { PrismaService } from 'src/shared/prisma/prisma.service';

@Injectable()
export class EnviarFotosRemessaRepository {
  constructor(private readonly prisma: PrismaService) {}

  buscarClienteDaRemessa(remessaId: bigint) {
    return this.prisma.remessa.findUnique({
      where: { id: remessaId },
      select: { clienteId: true },
    });
  }

  registrarFoto(
    dadosFoto: { remessaId: bigint; clienteId: bigint; filePath: string },
    transacao?: Prisma.TransactionClient,
  ) {
    return (transacao ?? this.prisma).remessaFoto.create({ data: dadosFoto });
  }
}
