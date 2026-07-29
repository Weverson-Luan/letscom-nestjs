import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { resolvePagination } from 'src/shared/database/pagination';
import { buildPagination } from 'src/shared/utils/api-response';

export interface AuthContext {
  userId: bigint;
  role: string; // primeira role, minúscula
}

const LIST_INCLUDE = {
  tecnologia: true,
  modeloTecnico: { include: { camposVariaveis: true } },
  cliente: true,
  consultor: true,
  executor: true,
  solicitante: true,
  solicitanteSubordinado: true,
  statusLogs: true,
} satisfies Prisma.RemessaInclude;

@Injectable()
export class RemessaRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Busca textual compartilhada. Nota de fidelidade: no Laravel usa LIKE em
   * situacao (enum) e numero_remessa; aqui traduzimos para filtros de relação +
   * match de numero_remessa quando o termo é numérico.
   */
  private buildSearch(search?: string): Prisma.RemessaWhereInput | undefined {
    if (!search) return undefined;
    const or: Prisma.RemessaWhereInput[] = [
      { cliente: { nome: { contains: search } } },
      { modeloTecnico: { nomeModelo: { contains: search } } },
      { consultor: { nome: { contains: search } } },
      { solicitante: { nome: { contains: search } } },
      { solicitanteSubordinado: { nome: { contains: search } } },
      { executor: { nome: { contains: search } } },
    ];
    if (/^\d+$/.test(search)) {
      or.push({ numeroRemessa: BigInt(search) });
    }
    return { OR: or };
  }

  private async run(
    where: Prisma.RemessaWhereInput,
    query: Record<string, unknown>,
    orderBy: Prisma.RemessaOrderByWithRelationInput,
    include: Prisma.RemessaInclude = LIST_INCLUDE,
  ) {
    const { page, perPage, skip, take } = resolvePagination(query, 10, 100);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.remessa.findMany({ where, include, orderBy, skip, take }),
      this.prisma.remessa.count({ where }),
    ]);
    return { items, pagination: buildPagination(total, page, perPage) };
  }

  async paginate(query: Record<string, unknown>, auth?: AuthContext) {
    const where: Prisma.RemessaWhereInput = { AND: [] as Prisma.RemessaWhereInput[] };
    const and = where.AND as Prisma.RemessaWhereInput[];

    // role 'cliente' vê apenas as próprias remessas (corrigido: cliente_id)
    if (auth?.role === 'cliente') {
      and.push({ clienteId: auth.userId });
    }
    const search = this.buildSearch(query.search as string);
    if (search) and.push(search);

    return this.run(
      where,
      query,
      { [(query.sort_by as string) ?? 'createdAt']: (query.order as 'asc' | 'desc') ?? 'desc' },
    );
  }

  async getDisponiveisParaProducao(query: Record<string, unknown>) {
    const and: Prisma.RemessaWhereInput[] = [
      { status: 'envio_de_dados', userIdExecutor: null },
    ];
    const search = this.buildSearch(query.search as string);
    if (search) and.push(search);
    return this.run({ AND: and }, query, { createdAt: 'asc' });
  }

  async getMinhasTarefas(query: Record<string, unknown>, auth: AuthContext) {
    const and: Prisma.RemessaWhereInput[] = [
      { status: 'em_producao', NOT: { userIdExecutor: null } },
    ];
    if (auth.role !== 'admin') {
      and.push({ userIdExecutor: auth.userId });
    }
    const search = this.buildSearch(query.search as string);
    if (search) and.push(search);
    return this.run({ AND: and }, query, { createdAt: 'asc' });
  }

  async getEmExpedicoes(query: Record<string, unknown>, auth: AuthContext) {
    if (!['admin', 'expedicao'].includes(auth.role)) {
      return this.emptyResult(query);
    }
    const and: Prisma.RemessaWhereInput[] = [
      { status: 'conferido', NOT: { userIdExecutor: null } },
    ];
    const search = this.buildSearch(query.search as string);
    if (search) and.push(search);
    return this.run({ AND: and }, query, { createdAt: 'desc' });
  }

  async getBalcao(query: Record<string, unknown>, auth: AuthContext) {
    if (!['admin', 'recepcao'].includes(auth.role)) {
      return this.emptyResult(query);
    }
    const and: Prisma.RemessaWhereInput[] = [
      { status: 'pedido_liberado', NOT: { userIdExecutor: null } },
    ];
    const search = this.buildSearch(query.search as string);
    if (search) and.push(search);
    return this.run({ AND: and }, query, { createdAt: 'desc' });
  }

  async getEmAndamentoPorCliente(clienteId: bigint, query: Record<string, unknown>) {
    const and: Prisma.RemessaWhereInput[] = [
      { clienteId, status: { notIn: ['concluida', 'concluído', 'cancelada'] } },
    ];
    const search = this.buildSearch(query.search as string);
    if (search) and.push(search);
    return this.run({ AND: and }, query, { createdAt: 'desc' }, {
      ...LIST_INCLUDE,
      fotos: true,
    });
  }

  async getFinalizadasPorCliente(clienteId: bigint, query: Record<string, unknown>) {
    const and: Prisma.RemessaWhereInput[] = [
      { clienteId, status: { in: ['concluida', 'concluído', 'cancelada'] } },
    ];
    const search = this.buildSearch(query.search as string);
    if (search) and.push(search);
    return this.run({ AND: and }, query, { createdAt: 'desc' });
  }

  findById(id: bigint, include: Prisma.RemessaInclude = LIST_INCLUDE) {
    return this.prisma.remessa.findUnique({ where: { id }, include });
  }

  create(data: Prisma.RemessaUncheckedCreateInput) {
    return this.prisma.remessa.create({ data });
  }

  update(id: bigint, data: Prisma.RemessaUncheckedUpdateInput) {
    return this.prisma.remessa.update({ where: { id }, data });
  }

  softDelete(id: bigint) {
    return this.prisma.remessa.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  private emptyResult(query: Record<string, unknown>) {
    const { page, perPage } = resolvePagination(query, 10, 100);
    return { items: [], pagination: buildPagination(0, page, perPage) };
  }
}
