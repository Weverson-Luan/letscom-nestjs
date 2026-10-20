import { Injectable } from '@nestjs/common';
import { ClienteCompromissoStatus, ClienteCompromissoTipo, Prisma } from '@prisma/client';
import { Role } from 'src/shared/constants/roles';
import { PrismaService } from 'src/shared/prisma/prisma.service';

const INCLUIR_RELACOES = {
  autor: { select: { id: true, nome: true } },
  responsavel: { select: { id: true, nome: true } },
  responsavelSubordinado: { select: { id: true, nome: true, email: true } },
} satisfies Prisma.ClienteCompromissoInclude;

export type CompromissoComRelacoes = Prisma.ClienteCompromissoGetPayload<{
  include: typeof INCLUIR_RELACOES;
}>;

export type FiltrosAgenda = {
  clienteId: bigint;
  /** true no /minha-agenda: só o que a equipe marcou como visível ao cliente. */
  somenteVisiveisCliente?: boolean;
  status?: ClienteCompromissoStatus;
  tipo?: ClienteCompromissoTipo;
  de?: Date;
  ate?: Date;
  search?: string;
};

@Injectable()
export class ClienteCompromissoRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Cliente = usuário não excluído com papel `cliente` ativo (`role_user` é @@ignore, por isso SQL cru). */
  async ehClienteAtivo(clienteId: bigint): Promise<boolean> {
    const linhas = await this.prisma.$queryRaw<{ id: bigint }[]>`
      SELECT u.id
      FROM users u
      INNER JOIN role_user ru ON ru.user_id = u.id AND ru.ativo = 1
      INNER JOIN roles r ON r.id = ru.role_id
      WHERE u.id = ${clienteId}
        AND u.deleted_at IS NULL
        AND LOWER(r.nome) = ${Role.CLIENTE}
      LIMIT 1
    `;
    return linhas.length > 0;
  }

  private montarWhere(filtros: FiltrosAgenda): Prisma.ClienteCompromissoWhereInput {
    const periodo: Prisma.DateTimeFilter = {
      ...(filtros.de ? { gte: filtros.de } : {}),
      ...(filtros.ate ? { lte: filtros.ate } : {}),
    };
    return {
      clienteId: filtros.clienteId,
      deletedAt: null,
      ...(filtros.somenteVisiveisCliente ? { visivelCliente: true } : {}),
      ...(filtros.status ? { status: filtros.status } : {}),
      ...(filtros.tipo ? { tipo: filtros.tipo } : {}),
      ...(filtros.de || filtros.ate ? { agendadoPara: periodo } : {}),
      ...(filtros.search
        ? {
            OR: [
              { titulo: { contains: filtros.search } },
              { descricao: { contains: filtros.search } },
            ],
          }
        : {}),
    };
  }

  async paginar(params: FiltrosAgenda & { skip: number; take: number }) {
    const where = this.montarWhere(params);
    const [data, total] = await Promise.all([
      this.prisma.clienteCompromisso.findMany({
        where,
        include: INCLUIR_RELACOES,
        orderBy: [{ agendadoPara: 'asc' }, { id: 'asc' }],
        skip: params.skip,
        take: params.take,
      }),
      this.prisma.clienteCompromisso.count({ where }),
    ]);
    return { data, total };
  }

  buscarPorId(
    clienteId: bigint,
    id: bigint,
    tx?: Prisma.TransactionClient,
  ): Promise<CompromissoComRelacoes | null> {
    return (tx ?? this.prisma).clienteCompromisso.findFirst({
      where: { id, clienteId, deletedAt: null },
      include: INCLUIR_RELACOES,
    });
  }

  criar(
    data: Prisma.ClienteCompromissoUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<CompromissoComRelacoes> {
    return (tx ?? this.prisma).clienteCompromisso.create({ data, include: INCLUIR_RELACOES });
  }

  atualizar(
    id: bigint,
    data: Prisma.ClienteCompromissoUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<CompromissoComRelacoes> {
    return (tx ?? this.prisma).clienteCompromisso.update({
      where: { id },
      data,
      include: INCLUIR_RELACOES,
    });
  }

  /** Exclusão lógica: o compromisso continua no banco para auditoria. */
  remover(id: bigint, tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).clienteCompromisso.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
