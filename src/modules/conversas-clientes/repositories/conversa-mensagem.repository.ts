import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Role } from 'src/shared/constants/roles';
import { PrismaService } from 'src/shared/prisma/prisma.service';

const INCLUIR_RELACOES = {
  autor: { select: { id: true, nome: true } },
  autorSubordinado: { select: { id: true, nome: true, email: true } },
  anexos: { orderBy: { id: 'asc' } },
} satisfies Prisma.ConversaMensagemInclude;

export type MensagemComRelacoes = Prisma.ConversaMensagemGetPayload<{
  include: typeof INCLUIR_RELACOES;
}>;

type FiltrosListagem = {
  clienteId: bigint;
  search?: string;
  /** Convidado só vê mensagens a partir de quando entrou (ver `calcularVisivelDesde`). */
  visivelDesde?: Date | null;
};

@Injectable()
export class ConversaMensagemRepository {
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

  private montarWhere(filtros: FiltrosListagem): Prisma.ConversaMensagemWhereInput {
    return {
      clienteId: filtros.clienteId,
      deletedAt: null,
      ...(filtros.visivelDesde ? { createdAt: { gte: filtros.visivelDesde } } : {}),
      ...(filtros.search ? { conteudo: { contains: filtros.search } } : {}),
    };
  }

  async paginar(params: FiltrosListagem & { skip: number; take: number }) {
    const where = this.montarWhere(params);
    const [data, total] = await Promise.all([
      this.prisma.conversaMensagem.findMany({
        where,
        include: INCLUIR_RELACOES,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: params.skip,
        take: params.take,
      }),
      this.prisma.conversaMensagem.count({ where }),
    ]);
    return { data, total };
  }

  buscarPorId(
    clienteId: bigint,
    id: bigint,
    tx?: Prisma.TransactionClient,
  ): Promise<MensagemComRelacoes | null> {
    return (tx ?? this.prisma).conversaMensagem.findFirst({
      where: { id, clienteId, deletedAt: null },
      include: INCLUIR_RELACOES,
    });
  }

  criar(data: Prisma.ConversaMensagemUncheckedCreateInput, tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).conversaMensagem.create({ data });
  }

  criarAnexos(data: Prisma.ConversaMensagemAnexoCreateManyInput[], tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).conversaMensagemAnexo.createMany({ data });
  }

  atualizar(
    id: bigint,
    data: Prisma.ConversaMensagemUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<MensagemComRelacoes> {
    return (tx ?? this.prisma).conversaMensagem.update({
      where: { id },
      data,
      include: INCLUIR_RELACOES,
    });
  }

  /** Exclusão lógica: a mensagem e os anexos continuam no banco/storage para auditoria. */
  remover(id: bigint, tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).conversaMensagem.update({
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

  /** `visivelDesde`: anexo de mensagem anterior à entrada do convidado não é encontrado. */
  buscarAnexo(
    clienteId: bigint,
    mensagemId: bigint,
    anexoId: bigint,
    visivelDesde: Date | null = null,
  ) {
    return this.prisma.conversaMensagemAnexo.findFirst({
      where: {
        id: anexoId,
        mensagemId,
        mensagem: {
          clienteId,
          deletedAt: null,
          ...(visivelDesde ? { createdAt: { gte: visivelDesde } } : {}),
        },
      },
    });
  }
}
