import { Injectable } from '@nestjs/common';
import { Prisma, RemessaStatusEtapa } from '@prisma/client';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { RemessaStatusRepository } from '../repositories/remessa-status.repository';
import { RemessasCacheService } from './remessas-cache.service';

/**
 * Espelha o RemessaStatusService: registra a mudança de status (idempotente),
 * atualiza a remessa e invalida os caches de listagem.
 */
@Injectable()
export class RemessaStatusService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: RemessaStatusRepository,
    private readonly cache: RemessasCacheService,
  ) {}

  /** Versão transacional (sem cache) para uso dentro do fluxo de solicitação. */
  async registrarStatusTx(
    tx: Prisma.TransactionClient,
    remessaId: bigint,
    status: RemessaStatusEtapa,
  ): Promise<void> {
    if (await this.repository.exists(remessaId, status, tx)) return;

    await this.repository.create({ remessaId, status, dataStatus: new Date() }, tx);
    await tx.remessa.update({ where: { id: remessaId }, data: { status } });
  }

  /** Versão standalone: transação própria + invalidação de cache. */
  async registrarStatus(remessaId: bigint, status: RemessaStatusEtapa): Promise<void> {
    const remessa = await this.prisma.remessa.findUnique({
      where: { id: remessaId },
      select: { clienteId: true },
    });
    if (!remessa) return;

    if (await this.repository.exists(remessaId, status)) return;

    await this.prisma.$transaction(async (tx) => {
      await this.repository.create({ remessaId, status, dataStatus: new Date() }, tx);
      await tx.remessa.update({ where: { id: remessaId }, data: { status } });
    });

    await this.cache.invalidarTudo(Number(remessa.clienteId));
  }

  listarHistorico(remessaId: bigint) {
    return this.repository.findByRemessaId(remessaId);
  }
}
