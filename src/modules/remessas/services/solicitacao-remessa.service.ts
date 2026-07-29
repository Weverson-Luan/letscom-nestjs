import { Injectable, Logger } from '@nestjs/common';
import { RemessaStatusEtapa } from '@prisma/client';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { StorageService } from 'src/shared/storage/storage.service';
import { RemessaRepository } from '../repositories/remessa.repository';
import { RemessaService, UploadFile } from './remessa.service';
import { RemessaStatusService } from './remessa-status.service';
import { RemessasCacheService } from './remessas-cache.service';

/**
 * Espelha o SolicitacaoRemessaService: fluxo atômico (remessa + ciência de
 * responsabilidade + histórico de status). Arquivos gravados no storage são
 * removidos se algo falhar após a escrita; caches são invalidados após o commit.
 */
@Injectable()
export class SolicitacaoRemessaService {
  private readonly logger = new Logger(SolicitacaoRemessaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly remessaService: RemessaService,
    private readonly remessaRepository: RemessaRepository,
    private readonly statusService: RemessaStatusService,
    private readonly storage: StorageService,
    private readonly cache: RemessasCacheService,
  ) {}

  async executar(data: Record<string, any>, csvFile?: UploadFile, zipFile?: UploadFile) {
    const storedFiles: string[] = [];
    let remessaId: bigint | null = null;

    try {
      const remessa = await this.prisma.$transaction(
        async (tx) => {
          const criada = await this.remessaService.solicitarRemessa(tx, {
            data,
            csvFile,
            zipFile,
            storedFiles,
          });
          remessaId = criada.id;

          // ciência de responsabilidade (updateOrCreate por cliente_id + documento)
          const existente = await tx.remessaResponsabilidade.findFirst({
            where: { clienteId: BigInt(data.cliente_id), documento: data.documento },
          });
          if (existente) {
            await tx.remessaResponsabilidade.update({
              where: { id: existente.id },
              data: { nome: data.nome, ativo: true, dataCiencia: new Date() },
            });
          } else {
            await tx.remessaResponsabilidade.create({
              data: {
                clienteId: BigInt(data.cliente_id),
                documento: data.documento,
                nome: data.nome,
                ativo: true,
                dataCiencia: new Date(),
              },
            });
          }

          await this.statusService.registrarStatusTx(
            tx,
            criada.id,
            data.status as RemessaStatusEtapa,
          );

          return criada;
        },
        { timeout: 120_000, maxWait: 20_000 },
      );

      await this.cache.invalidarTudo(Number(remessa.clienteId));

      return this.remessaRepository.findById(remessa.id);
    } catch (error) {
      // rollback de arquivos no storage (não participam do commit do banco)
      for (const file of storedFiles) {
        try {
          await this.storage.delete(file);
        } catch {
          /* noop */
        }
      }
      if (remessaId !== null) {
        try {
          await this.storage.deleteDirectory(`remessas/${remessaId}`);
        } catch {
          /* noop */
        }
      }
      this.logger.error(
        `Falha no fluxo de solicitação de remessa: ${(error as Error).message}`,
      );
      throw error;
    }
  }
}
