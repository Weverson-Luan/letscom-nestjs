/**
 * IMPORTS
 */
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

// shared
import { PrismaService } from 'src/shared/prisma/prisma.service';

@Injectable()
export class ListarConsultoresRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Usuários com papel ativo de consultor (ou admin), paginados por created_at. */
  async paginar(params: {
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
}
