import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/shared/prisma/prisma.service';

const SORT_MAP: Record<string, string> = {
  created_at: 'createdAt',
  updated_at: 'updatedAt',
  data_venda: 'dataVenda',
  status: 'status',
  quantidade_creditos: 'quantidadeCreditos',
  id: 'id',
};

const INCLUDE = {
  produto: true,
  executor: true,
} as const;

@Injectable()
export class CreditSaleRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: bigint) {
    return this.prisma.creditSale.findFirst({
      where: { id, deletedAt: null },
      include: { ...INCLUDE, cliente: true },
    });
  }

  async paginate(params: {
    clienteId?: bigint;
    search?: string;
    sortBy?: string;
    order?: 'asc' | 'desc';
    skip: number;
    take: number;
  }) {
    const where: Prisma.CreditSaleWhereInput = { deletedAt: null };

    if (params.clienteId) {
      where.clienteId = params.clienteId;
    }

    if (params.search) {
      const statusValues = [
        'pendente',
        'confirmado',
        'cancelada',
        'cancelado',
      ] as const;
      const searchLower = params.search.toLowerCase();
      const statusMatch = statusValues.find((s) => s.includes(searchLower));
      where.OR = [
        ...(statusMatch ? [{ status: statusMatch }] : []),
        { produto: { nome: { contains: params.search } } },
        { observacao: { contains: params.search } },
      ];
    }

    const sortField = SORT_MAP[params.sortBy ?? 'created_at'] ?? 'createdAt';
    const orderBy = { [sortField]: params.order ?? 'desc' };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.creditSale.findMany({
        where,
        include: INCLUDE,
        orderBy,
        skip: params.skip,
        take: params.take,
      }),
      this.prisma.creditSale.count({ where }),
    ]);

    return { data, total };
  }

  create(data: Prisma.CreditSaleCreateInput) {
    return this.prisma.creditSale.create({
      data,
      include: INCLUDE,
    });
  }

  update(id: bigint, data: Prisma.CreditSaleUpdateInput) {
    return this.prisma.creditSale.update({
      where: { id },
      data,
      include: INCLUDE,
    });
  }

  softDelete(id: bigint) {
    return this.prisma.creditSale.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /** Saldo confirmado cliente+produto (espelha calcularSaldoCreditosConfirmados...). */
  async saldoConfirmado(
    clienteId: bigint,
    produtoId: bigint,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const client = tx ?? this.prisma;
    const rows = await client.$queryRaw<{ saldo: bigint | null }[]>`
      SELECT CAST(COALESCE(SUM(
        CASE
          WHEN status = 'confirmado' AND tipo_transacao = 'entrada' THEN quantidade_creditos
          WHEN status = 'confirmado' AND tipo_transacao = 'saida' THEN -quantidade_creditos
          ELSE 0
        END
      ), 0) AS SIGNED) AS saldo
      FROM vendas_creditos
      WHERE cliente_id = ${clienteId}
        AND produto_id = ${produtoId}
        AND deleted_at IS NULL`;
    return Number(rows[0]?.saldo ?? 0);
  }

  async saldoPorClienteList(clienteId: bigint) {
    return this.prisma.$queryRaw<
      { produto_id: bigint; tipo: string; total: number }[]
    >`
      SELECT
        p.id AS produto_id,
        p.nome AS tipo,
        CAST(SUM(
          CASE
            WHEN v.status = 'confirmado' AND v.tipo_transacao = 'entrada' THEN v.quantidade_creditos
            WHEN v.status = 'confirmado' AND v.tipo_transacao = 'saida' THEN -v.quantidade_creditos
            ELSE 0
          END
        ) AS SIGNED) AS total
      FROM vendas_creditos v
      JOIN produtos p ON p.id = v.produto_id
      WHERE v.cliente_id = ${clienteId}
        AND v.deleted_at IS NULL
      GROUP BY p.id, p.nome
      HAVING total <> 0`;
  }

  async saldoPorClienteMap(clienteId: bigint) {
    const rows = await this.prisma.$queryRaw<{ tipo: string; total: number }[]>`
      SELECT
        p.nome AS tipo,
        CAST(SUM(
          CASE
            WHEN v.status = 'confirmado' AND v.tipo_transacao = 'entrada' THEN v.quantidade_creditos
            WHEN v.status = 'confirmado' AND v.tipo_transacao = 'saida' THEN -v.quantidade_creditos
            ELSE 0
          END
        ) AS SIGNED) AS total
      FROM vendas_creditos v
      JOIN produtos p ON p.id = v.produto_id
      WHERE v.cliente_id = ${clienteId}
        AND v.deleted_at IS NULL
      GROUP BY p.nome`;
    const map: Record<string, number> = {};
    for (const row of rows) {
      map[row.tipo] = Number(row.total);
    }
    return map;
  }
}
