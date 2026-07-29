import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TipoOperacaoCreditoCliente } from 'src/shared/constants/credito';
import { PrismaService } from 'src/shared/prisma/prisma.service';

const SORT_MAP: Record<string, string> = {
  created_at: 'createdAt',
  id: 'id',
};

@Injectable()
export class ExtratoMovimentacaoRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.ExtratoMovimentacaoCreditoClienteCreateInput) {
    return this.prisma.extratoMovimentacaoCreditoCliente.create({ data });
  }

  async paginatePorCliente(params: {
    clienteId: bigint;
    produtoId?: bigint;
    tipoOperacao?: string;
    direcaoMovimento?: string;
    dataInicio?: string;
    dataFim?: string;
    sortBy?: string;
    order?: 'asc' | 'desc';
    skip: number;
    take: number;
  }) {
    const where: Prisma.ExtratoMovimentacaoCreditoClienteWhereInput = {
      clienteId: params.clienteId,
    };

    if (params.produtoId) where.produtoId = params.produtoId;
    if (params.tipoOperacao) where.tipoOperacao = params.tipoOperacao;
    if (params.direcaoMovimento) where.direcaoMovimento = params.direcaoMovimento;
    if (params.dataInicio || params.dataFim) {
      where.createdAt = {};
      if (params.dataInicio) {
        where.createdAt.gte = new Date(`${params.dataInicio}T00:00:00.000Z`);
      }
      if (params.dataFim) {
        where.createdAt.lte = new Date(`${params.dataFim}T23:59:59.999Z`);
      }
    }

    const sortField = SORT_MAP[params.sortBy ?? 'created_at'] ?? 'createdAt';
    const orderBy = { [sortField]: params.order ?? 'desc' };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.extratoMovimentacaoCreditoCliente.findMany({
        where,
        include: {
          produto: true,
          remessa: true,
          responsavel: true,
        },
        orderBy,
        skip: params.skip,
        take: params.take,
      }),
      this.prisma.extratoMovimentacaoCreditoCliente.count({ where }),
    ]);

    return { data, total };
  }

  /** Base de consumos faturáveis (cobrança). */
  private whereFaturavel(
    clienteId: bigint,
    filtros: {
      produtoId?: bigint;
      numeroRemessa?: string;
      statusRemessa?: string;
      dataInicio?: string;
      dataFim?: string;
    },
  ): Prisma.ExtratoMovimentacaoCreditoClienteWhereInput {
    const where: Prisma.ExtratoMovimentacaoCreditoClienteWhereInput = {
      clienteId,
      tipoOperacao: TipoOperacaoCreditoCliente.CONSUMO_REMESSA,
      remessaId: { not: null },
      remessa: {
        situacao: { not: 'cancelada' },
        status: { not: 'cancelada' },
        ...(filtros.numeroRemessa
          ? { numeroRemessa: { equals: BigInt(filtros.numeroRemessa) } }
          : {}),
        ...(filtros.statusRemessa
          ? { situacao: filtros.statusRemessa as any }
          : {}),
      },
      NOT: {
        remessa: {
          extrato: {
            some: {
              clienteId,
              tipoOperacao: TipoOperacaoCreditoCliente.ESTORNO_CANCELAMENTO_REMESSA,
            },
          },
        },
      },
    };

    if (filtros.produtoId) where.produtoId = filtros.produtoId;
    if (filtros.dataInicio || filtros.dataFim) {
      where.createdAt = {};
      if (filtros.dataInicio) {
        where.createdAt.gte = new Date(`${filtros.dataInicio}T00:00:00.000Z`);
      }
      if (filtros.dataFim) {
        where.createdAt.lte = new Date(`${filtros.dataFim}T23:59:59.999Z`);
      }
    }

    return where;
  }

  async paginateCobranca(params: {
    clienteId: bigint;
    produtoId?: bigint;
    numeroRemessa?: string;
    statusRemessa?: string;
    dataInicio?: string;
    dataFim?: string;
    sortBy?: string;
    order?: 'asc' | 'desc';
    skip: number;
    take: number;
  }) {
    const where = this.whereFaturavel(params.clienteId, params);
    const sortField = SORT_MAP[params.sortBy ?? 'created_at'] ?? 'createdAt';
    const orderBy = { [sortField]: params.order ?? 'desc' };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.extratoMovimentacaoCreditoCliente.findMany({
        where,
        include: { produto: true, remessa: true },
        orderBy,
        skip: params.skip,
        take: params.take,
      }),
      this.prisma.extratoMovimentacaoCreditoCliente.count({ where }),
    ]);

    return { data, total };
  }

  async totaisCobranca(
    clienteId: bigint,
    filtros: {
      produtoId?: bigint;
      numeroRemessa?: string;
      statusRemessa?: string;
      dataInicio?: string;
      dataFim?: string;
    },
  ) {
    // Usa SQL para COUNT DISTINCT + SUM com join produtos (como Laravel).
    const rows = await this.prisma.$queryRaw<
      {
        total_remessas_faturaveis: bigint;
        total_creditos_consumidos: number;
        valor_total_cobranca: number;
      }[]
    >`
      SELECT
        COUNT(DISTINCT e.remessa_id) AS total_remessas_faturaveis,
        COALESCE(SUM(e.quantidade_creditos), 0) AS total_creditos_consumidos,
        COALESCE(SUM(e.quantidade_creditos * p.valor_creditos), 0) AS valor_total_cobranca
      FROM extrato_movimentacoes_creditos_cliente e
      INNER JOIN produtos p ON p.id = e.produto_id
      INNER JOIN remessas r ON r.id = e.remessa_id
      WHERE e.cliente_id = ${clienteId}
        AND e.tipo_operacao = ${TipoOperacaoCreditoCliente.CONSUMO_REMESSA}
        AND e.remessa_id IS NOT NULL
        AND r.situacao <> 'cancelada'
        AND r.status <> 'cancelada'
        AND NOT EXISTS (
          SELECT 1 FROM extrato_movimentacoes_creditos_cliente est
          WHERE est.remessa_id = e.remessa_id
            AND est.cliente_id = ${clienteId}
            AND est.tipo_operacao = ${TipoOperacaoCreditoCliente.ESTORNO_CANCELAMENTO_REMESSA}
        )
        ${filtros.produtoId ? Prisma.sql`AND e.produto_id = ${filtros.produtoId}` : Prisma.empty}
        ${filtros.numeroRemessa ? Prisma.sql`AND r.numero_remessa = ${BigInt(filtros.numeroRemessa)}` : Prisma.empty}
        ${filtros.statusRemessa ? Prisma.sql`AND r.situacao = ${filtros.statusRemessa}` : Prisma.empty}
        ${filtros.dataInicio ? Prisma.sql`AND DATE(e.created_at) >= ${filtros.dataInicio}` : Prisma.empty}
        ${filtros.dataFim ? Prisma.sql`AND DATE(e.created_at) <= ${filtros.dataFim}` : Prisma.empty}
    `;

    const row = rows[0];
    return {
      total_remessas_faturaveis: Number(row?.total_remessas_faturaveis ?? 0),
      total_creditos_consumidos: Number(row?.total_creditos_consumidos ?? 0),
      valor_total_cobranca: Number(row?.valor_total_cobranca ?? 0),
    };
  }
}
