import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/shared/prisma/prisma.service';

const LIST_INCLUDE = {
  clienteConsultores: { include: { consultor: true }, orderBy: { id: 'asc' as const } },
  produtosVinculados: { include: { produto: true } },
  tiposEntregaUser: { include: { tipoEntrega: true } },
  enderecos: true,
} satisfies Prisma.UserInclude;

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  private buildSearchWhere(search?: string): Prisma.UserWhereInput | undefined {
    if (!search) return undefined;
    const or: Prisma.UserWhereInput[] = [
      { nome: { contains: search } },
      { email: { contains: search } },
      { documento: { contains: search } },
      { telefone: { contains: search } },
    ];
    if (/^\d+$/.test(search)) {
      or.push({ id: BigInt(search) });
    }
    return { OR: or };
  }

  async paginate(params: {
    search?: string;
    sortBy?: string;
    order?: 'asc' | 'desc';
    skip: number;
    take: number;
  }) {
    const where = this.buildSearchWhere(params.search);
    const orderBy = { [params.sortBy ?? 'createdAt']: params.order ?? 'desc' };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        orderBy,
        include: LIST_INCLUDE,
        skip: params.skip,
        take: params.take,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data, total };
  }

  async paginateConsultores(params: {
    search?: string;
    sortBy?: string;
    order?: 'asc' | 'desc';
    skip: number;
    take: number;
  }) {
    const orderByField = params.sortBy === 'created_at' ? 'createdAt' : (params.sortBy ?? 'createdAt');
    const order = params.order ?? 'desc';
    const search = params.search ? `%${params.search}%` : null;

    const rows = await this.prisma.$queryRaw<{ id: bigint }[]>`
      SELECT DISTINCT u.id
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
