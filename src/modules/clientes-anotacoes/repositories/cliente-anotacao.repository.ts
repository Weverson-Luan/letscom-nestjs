import { Injectable } from '@nestjs/common';
import { ClienteAnotacaoTipo, Prisma } from '@prisma/client';
import { Role } from 'src/shared/constants/roles';
import { PrismaService } from 'src/shared/prisma/prisma.service';

const INCLUIR_RELACOES = {
  autor: { select: { id: true, nome: true } },
  autorSubordinado: { select: { id: true, nome: true, email: true } },
  anexos: { orderBy: { id: 'asc' } },
} satisfies Prisma.ClienteAnotacaoInclude;

export type AnotacaoComRelacoes = Prisma.ClienteAnotacaoGetPayload<{
  include: typeof INCLUIR_RELACOES;
}>;

type FiltrosListagem = { clienteId: bigint; tipo?: ClienteAnotacaoTipo; search?: string };

@Injectable()
export class ClienteAnotacaoRepository {
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

  private montarWhere(filtros: FiltrosListagem): Prisma.ClienteAnotacaoWhereInput {
    return {
      clienteId: filtros.clienteId,
      deletedAt: null,
      ...(filtros.tipo ? { tipo: filtros.tipo } : {}),
      ...(filtros.search ? { conteudo: { contains: filtros.search } } : {}),
    };
  }

  async paginar(params: FiltrosListagem & { skip: number; take: number }) {
    const where = this.montarWhere(params);
    const [data, total] = await Promise.all([
      this.prisma.clienteAnotacao.findMany({
        where,
        include: INCLUIR_RELACOES,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: params.skip,
        take: params.take,
      }),
      this.prisma.clienteAnotacao.count({ where }),
    ]);
    return { data, total };
  }

  buscarPorId(
    clienteId: bigint,
    id: bigint,
    tx?: Prisma.TransactionClient,
  ): Promise<AnotacaoComRelacoes | null> {
    return (tx ?? this.prisma).clienteAnotacao.findFirst({
      where: { id, clienteId, deletedAt: null },
      include: INCLUIR_RELACOES,
    });
  }

  criar(data: Prisma.ClienteAnotacaoUncheckedCreateInput, tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).clienteAnotacao.create({ data });
  }

  criarAnexos(data: Prisma.ClienteAnotacaoAnexoCreateManyInput[], tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).clienteAnotacaoAnexo.createMany({ data });
  }

  atualizar(
    id: bigint,
    data: Prisma.ClienteAnotacaoUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<AnotacaoComRelacoes> {
    return (tx ?? this.prisma).clienteAnotacao.update({
      where: { id },
      data,
      include: INCLUIR_RELACOES,
    });
  }

  /** Exclusão lógica: a anotação e os anexos continuam no banco/storage para auditoria. */
  remover(id: bigint, tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).clienteAnotacao.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async buscarNomeCliente(clienteId: bigint): Promise<string | null> {
    const cliente = await this.prisma.user.findUnique({
      where: { id: clienteId },
      select: { nome: true },
    });
    return cliente?.nome ?? null;
  }

  buscarAnexo(clienteId: bigint, anotacaoId: bigint, anexoId: bigint) {
    return this.prisma.clienteAnotacaoAnexo.findFirst({
      where: { id: anexoId, anotacaoId, anotacao: { clienteId, deletedAt: null } },
    });
  }
}
