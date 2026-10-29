/**
 * IMPORTS
 */
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

// shared
import { PrismaService } from 'src/shared/prisma/prisma.service';

@Injectable()
export class EnviarPlanilhaRemessaRepository {
  constructor(private readonly prisma: PrismaService) {}

  buscarClienteDaRemessa(remessaId: bigint) {
    return this.prisma.remessa.findUnique({
      where: { id: remessaId },
      select: { clienteId: true },
    });
  }

  registrarPlanilha(
    dadosPlanilha: { remessaId: bigint; clienteId: bigint; filePath: string; tipo: string },
    transacao?: Prisma.TransactionClient,
  ) {
    return (transacao ?? this.prisma).remessaPlanilha.create({ data: dadosPlanilha });
  }
}
