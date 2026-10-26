import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Role } from 'src/shared/constants/roles';
import { PrismaService } from 'src/shared/prisma/prisma.service';

const LIST_INCLUDE = {
  clienteConsultores: { include: { consultor: true }, orderBy: { id: 'asc' as const } },
  produtosVinculados: { include: { produto: true } },
  tiposEntregaUser: { include: { tipoEntrega: true } },
  enderecos: true,
} satisfies Prisma.UserInclude;

/** sort_by aceito na listagem de clientes -> coluna de users (whitelist contra SQL injection). */
const COLUNAS_ORDENACAO_CLIENTES: Record<string, string> = {
  createdAt: 'created_at',
  created_at: 'created_at',
  nome: 'nome',
  email: 'email',
  id: 'id',
};

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lista só usuários com o papel 'cliente' ativo (role_user é @@ignore no Prisma,
   * então ids e total saem em SQL e os relacionamentos via findMany).
   */
  async paginate(params: {
    search?: string;
    sortBy?: string;
    order?: 'asc' | 'desc';
    skip: number;
    take: number;
  }) {
    const colunaOrdenacao = COLUNAS_ORDENACAO_CLIENTES[params.sortBy ?? ''] ?? 'created_at';
    const direcao = params.order === 'asc' ? 'ASC' : 'DESC';
    const where = Prisma.sql`
      WHERE EXISTS (
        SELECT 1
        FROM role_user ru
        INNER JOIN roles r ON r.id = ru.role_id
        WHERE ru.user_id = u.id AND ru.ativo = 1 AND LOWER(r.nome) = ${Role.CLIENTE}
      )
      ${this.montarFiltroBuscaClientesSql(params.search)}
    `;

    const rows = await this.prisma.$queryRaw<{ id: bigint }[]>`
      SELECT u.id
      FROM users u
      ${where}
      ORDER BY u.${Prisma.raw(colunaOrdenacao)} ${Prisma.raw(direcao)}, u.id ${Prisma.raw(direcao)}
      LIMIT ${params.take} OFFSET ${params.skip}
    `;

    const countRows = await this.prisma.$queryRaw<[{ total: bigint }]>`
      SELECT COUNT(*) AS total
      FROM users u
      ${where}
    `;

    const ids = rows.map((row) => row.id);
    const usuarios =
      ids.length === 0
        ? []
        : await this.prisma.user.findMany({ where: { id: { in: ids } }, include: LIST_INCLUDE });

    // findMany não garante a ordem do IN; reaplica a ordem paginada do SQL
    const usuariosPorId = new Map(usuarios.map((usuario) => [usuario.id, usuario]));
    const data = ids.map((id) => usuariosPorId.get(id)).filter((usuario) => usuario !== undefined);

    return { data, total: Number(countRows[0]?.total ?? 0) };
  }

  private montarFiltroBuscaClientesSql(search?: string): Prisma.Sql {
    if (!search) return Prisma.empty;
    const termo = `%${search}%`;
    const porId = /^\d+$/.test(search) ? Prisma.sql`OR u.id = ${BigInt(search)}` : Prisma.empty;
    return Prisma.sql`
      AND (
        u.nome LIKE ${termo}
        OR u.email LIKE ${termo}
        OR u.documento LIKE ${termo}
        OR u.telefone LIKE ${termo}
        ${porId}
      )
    `;
  }

  async paginateConsultores(params: {
    search?: string;
    sortBy?: string;
    order?: 'asc' | 'desc';
    skip: number;
    take: number;
  }) {
    const orderByField =
      params.sortBy === 'created_at' ? 'createdAt' : (params.sortBy ?? 'createdAt');
    const order = params.order ?? 'desc';
    const search = params.search ? `%${params.search}%` : null;

    // created_at no SELECT: com DISTINCT, o MySQL 8 exige a coluna do ORDER BY no SELECT (erro 3065)
    const rows = await this.prisma.$queryRaw<{ id: bigint }[]>`
      SELECT DISTINCT u.id, u.created_at
      FROM users u
      INNER JOIN role_user ru ON ru.user_id = u.id AND ru.ativo = 1
      INNER JOIN roles r ON r.id = ru.role_id
      WHERE (
        LOWER(r.nome) LIKE '%consultor%'
        OR LOWER(r.nome) = 'admin'
      )
      ${search ? Prisma.sql`AND u.nome LIKE ${search}` : Prisma.empty}
      ORDER BY u.created_at ${Prisma.raw(order === 'asc' ? 'ASC' : 'DESC')}
      LIMIT ${params.take} OFFSET ${params.skip}
    `;

    const countRows = await this.prisma.$queryRaw<[{ total: bigint }]>`
      SELECT COUNT(DISTINCT u.id) AS total
      FROM users u
      INNER JOIN role_user ru ON ru.user_id = u.id AND ru.ativo = 1
      INNER JOIN roles r ON r.id = ru.role_id
      WHERE (
        LOWER(r.nome) LIKE '%consultor%'
        OR LOWER(r.nome) = 'admin'
      )
      ${search ? Prisma.sql`AND u.nome LIKE ${search}` : Prisma.empty}
    `;

    const ids = rows.map((row) => row.id);
    const data =
      ids.length === 0
        ? []
        : await this.prisma.user.findMany({
            where: { id: { in: ids } },
            orderBy: { [orderByField]: order },
          });

    return { data, total: Number(countRows[0]?.total ?? 0) };
  }

  findByIdWithTipoEntrega(id: bigint) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        modelosTecnicos: true,
        tiposEntregaUser: { include: { tipoEntrega: true } },
      },
    });
  }

  findById(id: bigint) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  create(data: Prisma.UserCreateInput) {
    return this.prisma.user.create({ data });
  }

  update(id: bigint, data: Prisma.UserUpdateInput) {
    return this.prisma.user.update({ where: { id }, data });
  }

  /** Soft delete (espelha o SoftDeletes: seta deleted_at). */
  softDelete(id: bigint) {
    return this.prisma.user.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
