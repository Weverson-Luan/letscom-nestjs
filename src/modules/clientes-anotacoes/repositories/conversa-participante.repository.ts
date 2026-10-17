import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { PAPEIS_INTERNOS_CONVIDAVEIS, PessoaConversa } from '../clientes-anotacoes.constants';

const INCLUIR_PESSOA = {
  user: { select: { id: true, nome: true, email: true } },
  subordinado: { select: { id: true, nome: true, email: true } },
} satisfies Prisma.ConversaParticipanteInclude;

export type ParticipanteComPessoa = Prisma.ConversaParticipanteGetPayload<{
  include: typeof INCLUIR_PESSOA;
}>;

export type CandidatoConvite = {
  user_id: bigint | null;
  subordinado_id: bigint | null;
  nome: string | null;
  email: string;
};

function filtroPessoa(pessoa: PessoaConversa): Prisma.ConversaParticipanteWhereInput {
  return 'userId' in pessoa ? { userId: pessoa.userId } : { subordinadoId: pessoa.subordinadoId };
}

function montarBusca(search?: string): string | null {
  // escapa curingas do LIKE para que `_`/`%` digitados sejam buscados literalmente
  return search ? `%${search.replace(/[\\%_]/g, '\\$&')}%` : null;
}

/** Participantes da conversa do cliente (uma conversa por cliente) e convites. */
@Injectable()
export class ConversaParticipanteRepository {
  constructor(private readonly prisma: PrismaService) {}

  buscarDaPessoa(
    clienteId: bigint,
    pessoa: PessoaConversa,
    tx?: Prisma.TransactionClient,
  ): Promise<ParticipanteComPessoa | null> {
    return (tx ?? this.prisma).conversaParticipante.findFirst({
      where: { clienteId, ...filtroPessoa(pessoa) },
      include: INCLUIR_PESSOA,
    });
  }

  buscarPorId(id: bigint, tx?: Prisma.TransactionClient): Promise<ParticipanteComPessoa | null> {
    return (tx ?? this.prisma).conversaParticipante.findUnique({
      where: { id },
      include: INCLUIR_PESSOA,
    });
  }

  /** Donos com o cadastro do usuário (para ignorar operador desativado). */
  listarDonos(clienteId: bigint, tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).conversaParticipante.findMany({
      where: { clienteId, papel: 'dono' },
      select: {
        id: true,
        userId: true,
        subordinadoId: true,
        user: { select: { ativo: true, deletedAt: true } },
      },
    });
  }

  /** Donos primeiro, depois na ordem do convite. */
  listar(clienteId: bigint): Promise<ParticipanteComPessoa[]> {
    return this.prisma.conversaParticipante.findMany({
      where: { clienteId },
      include: INCLUIR_PESSOA,
      orderBy: [{ papel: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
    });
  }

  /** Participantes com convite aceito e cadastro ativo (destinatários das mensagens). */
  listarAceitosAtivos(clienteId: bigint, tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).conversaParticipante.findMany({
      where: {
        clienteId,
        status: 'aceito',
        OR: [{ user: { ativo: true, deletedAt: null } }, { subordinado: { ativo: true } }],
      },
      select: { userId: true, subordinadoId: true },
    });
  }

  criar(data: Prisma.ConversaParticipanteUncheckedCreateInput, tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).conversaParticipante.create({ data, include: INCLUIR_PESSOA });
  }

  atualizar(
    id: bigint,
    data: Prisma.ConversaParticipanteUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return (tx ?? this.prisma).conversaParticipante.update({
      where: { id },
      data,
      include: INCLUIR_PESSOA,
    });
  }

  /** Remove o participante; as notificações do convite caem junto (FK em cascata). */
  remover(id: bigint, tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).conversaParticipante.delete({ where: { id } });
  }

  /**
   * Responde o convite só se ainda estiver pendente (update condicional): numa corrida com
   * outra resposta ou com a remoção, devolve false em vez de sobrescrever.
   */
  async responderConvite(
    id: bigint,
    status: 'aceito' | 'recusado',
    tx?: Prisma.TransactionClient,
  ): Promise<boolean> {
    const { count } = await (tx ?? this.prisma).conversaParticipante.updateMany({
      where: { id, status: 'pendente' },
      data: { status, respondidoEm: new Date() },
    });
    return count > 0;
  }

  /**
   * Trava a linha do cliente até o fim da transação: serializa o início da conversa para que
   * duas pessoas iniciando ao mesmo tempo não virem donas.
   */
  async travarConversa(clienteId: bigint, tx: Prisma.TransactionClient): Promise<void> {
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${clienteId} FOR UPDATE`;
  }

  /** Usuário interno ativo (papel admin/consultor/produção/recepção). `role_user` é @@ignore. */
  async ehInternoAtivo(userId: bigint): Promise<boolean> {
    const linhas = await this.prisma.$queryRaw<{ id: bigint }[]>`
      SELECT u.id
      FROM users u
      INNER JOIN role_user ru ON ru.user_id = u.id AND ru.ativo = 1
      INNER JOIN roles r ON r.id = ru.role_id
      WHERE u.id = ${userId}
        AND u.ativo = 1
        AND u.deleted_at IS NULL
        AND LOWER(r.nome) IN (${Prisma.join([...PAPEIS_INTERNOS_CONVIDAVEIS])})
      LIMIT 1
    `;
    return linhas.length > 0;
  }

  async ehClientePrincipalAtivo(clienteId: bigint): Promise<boolean> {
    const cliente = await this.prisma.user.findFirst({
      where: { id: clienteId, ativo: true, deletedAt: null },
      select: { id: true },
    });
    return cliente !== null;
  }

  async ehSubordinadoAtivoDoCliente(clienteId: bigint, subordinadoId: bigint): Promise<boolean> {
    const subordinado = await this.prisma.userCliente.findFirst({
      where: { id: subordinadoId, clienteId, ativo: true },
      select: { id: true },
    });
    return subordinado !== null;
  }

  /** Internos ativos que ainda não participam nem têm convite pendente nesta conversa. */
  listarCandidatosInternos(params: { clienteId: bigint; search?: string; take: number }) {
    const busca = montarBusca(params.search);
    return this.prisma.$queryRaw<CandidatoConvite[]>`
      SELECT DISTINCT u.id AS user_id, NULL AS subordinado_id, u.nome, u.email
      FROM users u
      INNER JOIN role_user ru ON ru.user_id = u.id AND ru.ativo = 1
      INNER JOIN roles r ON r.id = ru.role_id
      WHERE u.ativo = 1
        AND u.deleted_at IS NULL
        AND u.id <> ${params.clienteId}
        AND LOWER(r.nome) IN (${Prisma.join([...PAPEIS_INTERNOS_CONVIDAVEIS])})
        AND NOT EXISTS (
          SELECT 1 FROM conversa_participantes p
          WHERE p.cliente_id = ${params.clienteId} AND p.user_id = u.id
            AND p.status IN ('pendente', 'aceito')
        )
        ${busca ? Prisma.sql`AND (u.nome LIKE ${busca} OR u.email LIKE ${busca})` : Prisma.empty}
      ORDER BY u.nome ASC, u.id ASC
      LIMIT ${params.take}
    `;
  }

  /** Cliente principal e subordinados ativos que ainda não participam nem têm convite pendente. */
  async listarCandidatosLadoCliente(params: {
    clienteId: bigint;
    search?: string;
    take: number;
  }): Promise<CandidatoConvite[]> {
    const ocupados: Prisma.ConversaParticipanteWhereInput = {
      status: { in: ['pendente', 'aceito'] },
    };
    const busca = params.search
      ? { OR: [{ nome: { contains: params.search } }, { email: { contains: params.search } }] }
      : {};
    const [principal, subordinados] = await Promise.all([
      this.prisma.user.findFirst({
        where: {
          id: params.clienteId,
          ativo: true,
          deletedAt: null,
          conversasParticipante: { none: { clienteId: params.clienteId, ...ocupados } },
          ...busca,
        },
        select: { id: true, nome: true, email: true },
      }),
      this.prisma.userCliente.findMany({
        where: {
          clienteId: params.clienteId,
          ativo: true,
          conversasParticipante: { none: { clienteId: params.clienteId, ...ocupados } },
          ...busca,
        },
        select: { id: true, nome: true, email: true },
        orderBy: [{ nome: 'asc' }, { id: 'asc' }],
        take: params.take,
      }),
    ]);
    return [
      ...(principal
        ? [
            {
              user_id: principal.id,
              subordinado_id: null,
              nome: principal.nome,
              email: principal.email,
            },
          ]
        : []),
      ...subordinados.map((subordinado) => ({
        user_id: null,
        subordinado_id: subordinado.id,
        nome: subordinado.nome,
        email: subordinado.email,
      })),
    ].slice(0, params.take);
  }
}
