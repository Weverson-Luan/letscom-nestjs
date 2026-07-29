import { Injectable } from '@nestjs/common';
import { Remessa, RemessaSituacao, User } from '@prisma/client';
import { AuthUser } from 'src/shared/decorators/current-user.decorator';
import { BusinessException } from 'src/shared/exceptions/business.exception';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { LiberarRemessasLoteDto } from '../dto/liberar-remessas-lote.dto';
import { LoteValidacaoException } from '../exceptions/lote-validacao.exception';
import { RemessaLiberadaBalcaoRepository } from '../repositories/remessa-liberada-balcao.repository';
import { RemessaLiberadaClienteRepository } from '../repositories/remessa-liberada-cliente.repository';

type RemessaComCliente = Remessa & { cliente?: User | null };

type LoteItem = {
  id: bigint | number;
  numero_remessa: string | number | bigint;
  motivo?: string;
};

@Injectable()
export class LiberarRemessasLoteClienteService {
  private static readonly STATUS_APTO = 'pedido_liberado';
  private static readonly SITUACOES_INVALIDAS = ['cancelada', 'cancelado'];

  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: RemessaLiberadaClienteRepository,
    private readonly balcaoRepository: RemessaLiberadaBalcaoRepository,
  ) {}

  async liberarEmLote(dto: LiberarRemessasLoteDto, user: AuthUser) {
    const remessaIds = [...new Set(dto.remessa_ids.map((id) => BigInt(id)))];
    const continuarApenasValidas = Boolean(dto.continuar_apenas_validas);

    const validacao = await this.validarRemessas(remessaIds);

    if (validacao.invalidas.length > 0 && !continuarApenasValidas) {
      throw new LoteValidacaoException(validacao.invalidas, validacao.validas);
    }

    if (validacao.remessasValidas.length === 0) {
      throw new BusinessException('Nenhuma remessa válida para liberação.');
    }

    const executor = await this.prisma.user.findUnique({ where: { id: user.id } });
    if (!executor) {
      throw new BusinessException('Usuário executor não encontrado.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.remessaLiberadaCliente.createMany({
        data: validacao.remessasValidas.map((remessa) => ({
          remessaId: remessa.id,
          userIdExecutor: executor.id,
          tipoEntregaId: validacao.tiposPorRemessa.get(remessa.id.toString())!,
          observacao: dto.observacao ?? null,
          outros: dto.outros ?? null,
        })),
      });

      await tx.remessa.updateMany({
        where: { id: { in: validacao.remessasValidas.map((r) => r.id) } },
        data: {
          status: 'concluido',
          situacao: RemessaSituacao.concluido,
        },
      });
    });

    return {
      liberadas: validacao.remessasValidas.map((r) => ({
        id: r.id,
        numero_remessa: r.numeroRemessa,
      })),
      invalidas: validacao.invalidas,
      total_liberadas: validacao.remessasValidas.length,
      total_invalidas: validacao.invalidas.length,
      grupos: validacao.grupos,
    };
  }

  private async validarRemessas(remessaIds: bigint[]) {
    const remessas = await this.prisma.remessa.findMany({
      where: { id: { in: remessaIds }, deletedAt: null },
      include: { cliente: true },
    });
    const byId = new Map(remessas.map((r) => [r.id.toString(), r as RemessaComCliente]));

    const jaLiberadas = await this.repository.findRemessaIdsLiberadas(remessaIds);
    const jaLiberadasSet = new Set(jaLiberadas.map((r) => r.remessaId.toString()));

    const liberacoesExpedicao =
      await this.balcaoRepository.findRemessaIdsLiberadas(remessaIds);
    const expedicaoSet = new Set(
      liberacoesExpedicao.map((r) => r.remessaId.toString()),
    );

    const clienteIds = [
      ...new Set(remessas.map((r) => r.clienteId.toString())),
    ].map((id) => BigInt(id));

    const tipos = await this.prisma.tipoEntregaUser.findMany({
      where: { clienteId: { in: clienteIds } },
    });
    const tiposPorCliente = new Map(
      tipos.map((t) => [t.clienteId.toString(), t.tipoEntregaId]),
    );

    const validas: LoteItem[] = [];
    const invalidas: LoteItem[] = [];
    const remessasValidas: RemessaComCliente[] = [];
    const tiposPorRemessa = new Map<string, bigint>();

    for (const id of remessaIds) {
      const remessa = byId.get(id.toString());

      if (!remessa) {
        invalidas.push({
          id,
          numero_remessa: String(id),
          motivo: 'Remessa não encontrada',
        });
        continue;
      }

      if (jaLiberadasSet.has(remessa.id.toString())) {
        invalidas.push({
          id: remessa.id,
          numero_remessa: remessa.numeroRemessa,
          motivo: 'Remessa já liberada',
        });
        continue;
      }

      if (!expedicaoSet.has(remessa.id.toString())) {
        invalidas.push({
          id: remessa.id,
          numero_remessa: remessa.numeroRemessa,
          motivo: 'Remessa ainda não liberada pela expedição',
        });
        continue;
      }

      const situacao = (remessa.situacao ?? '').toString().toLowerCase();
      const status = (remessa.status ?? '').toLowerCase();
      if (
        LiberarRemessasLoteClienteService.SITUACOES_INVALIDAS.includes(situacao) ||
        LiberarRemessasLoteClienteService.SITUACOES_INVALIDAS.includes(status)
      ) {
        invalidas.push({
          id: remessa.id,
          numero_remessa: remessa.numeroRemessa,
          motivo: 'Remessa cancelada',
        });
        continue;
      }

      if (remessa.status !== LiberarRemessasLoteClienteService.STATUS_APTO) {
        invalidas.push({
          id: remessa.id,
          numero_remessa: remessa.numeroRemessa,
          motivo: 'Remessa não está apta para liberação',
        });
        continue;
      }

      const tipoEntregaId = tiposPorCliente.get(remessa.clienteId.toString());
      if (!tipoEntregaId) {
        invalidas.push({
          id: remessa.id,
          numero_remessa: remessa.numeroRemessa,
          motivo: 'Cliente sem tipo de entrega cadastrado',
        });
        continue;
      }

      tiposPorRemessa.set(remessa.id.toString(), tipoEntregaId);
      validas.push({ id: remessa.id, numero_remessa: remessa.numeroRemessa });
      remessasValidas.push(remessa);
    }

    return {
      validas,
      invalidas,
      remessasValidas,
      tiposPorRemessa,
      grupos: this.montarGruposPorCliente(remessasValidas, tiposPorRemessa),
    };
  }

  private montarGruposPorCliente(
    remessas: RemessaComCliente[],
    tiposPorRemessa: Map<string, bigint>,
  ) {
    const grupos = new Map<
      string,
      {
        cliente_id: bigint;
        cliente: string;
        quantidade: number;
        tipo_entrega_id: bigint | null;
      }
    >();

    for (const remessa of remessas) {
      const key = remessa.clienteId.toString();
      if (!grupos.has(key)) {
        grupos.set(key, {
          cliente_id: remessa.clienteId,
          cliente: remessa.cliente?.nome ?? 'Cliente',
          quantidade: 0,
          tipo_entrega_id: tiposPorRemessa.get(remessa.id.toString()) ?? null,
        });
      }
      grupos.get(key)!.quantidade++;
    }

    return [...grupos.values()];
  }
}
