import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Role } from 'src/shared/constants/roles';
import { PrismaService } from 'src/shared/prisma/prisma.service';

export type LinhaResumoCliente = {
  id: bigint;
  nome: string;
  email: string;
  telefone: string;
  documento: string | null;
  ativo: boolean | number;
  total_anotacoes: bigint;
  ultima_anotacao_em: Date | null;
};

type Filtros = { search?: string; id?: bigint };

/**
 * Clientes (papel `cliente` ativo, não excluídos) com total de anotações e data da última.
 * `role_user` não tem PK (@@ignore no Prisma), por isso SQL cru.
 */
@Injectable()
export class ClienteResumoAnotacoesRepository {
  constructor(private readonly prisma: PrismaService) {}

  private montarSqlBase(filtros: Filtros): Prisma.Sql {
    // escapa curingas do LIKE para que `_`/`%` digitados sejam buscados literalmente
    const busca = filtros.search ? `%${filtros.search.replace(/[\\%_]/g, '\\$&')}%` : null;
    return Prisma.sql`
      FROM users u
      LEFT JOIN clientes_anotacoes a ON a.cliente_id = u.id AND a.deleted_at IS NULL
      WHERE u.deleted_at IS NULL
        AND EXISTS (
          SELECT 1 FROM role_user ru
          INNER JOIN roles r ON r.id = ru.role_id
          WHERE ru.user_id = u.id AND ru.ativo = 1 AND LOWER(r.nome) = ${Role.CLIENTE}
        )
        ${filtros.id ? Prisma.sql`AND u.id = ${filtros.id}` : Prisma.empty}
        ${
          busca
            ? Prisma.sql`AND (u.nome LIKE ${busca} OR u.email LIKE ${busca}
                OR u.telefone LIKE ${busca} OR u.documento LIKE ${busca})`
            : Prisma.empty
        }
    `;
  }

  private selecionar(base: Prisma.Sql): Prisma.Sql {
    return Prisma.sql`
      SELECT u.id, u.nome, u.email, u.telefone, u.documento, u.ativo,
        COUNT(a.id) AS total_anotacoes, MAX(a.created_at) AS ultima_anotacao_em
      ${base}
      GROUP BY u.id, u.nome, u.email, u.telefone, u.documento, u.ativo
    `;
  }

  /** Quem teve contato mais recente primeiro; clientes sem anotação por último, em ordem alfabética. */
  async paginar(params: { search?: string; skip: number; take: number }) {
    const base = this.montarSqlBase(params);
    const [data, contagem] = await Promise.all([
      this.prisma.$queryRaw<LinhaResumoCliente[]>`
        ${this.selecionar(base)}
        ORDER BY MAX(a.created_at) IS NULL, MAX(a.created_at) DESC, u.nome ASC, u.id ASC
        LIMIT ${params.take} OFFSET ${params.skip}
      `,
      this.prisma.$queryRaw<[{ total: bigint }]>`
        SELECT COUNT(DISTINCT u.id) AS total
        ${base}
      `,
    ]);
    return { data, total: Number(contagem[0]?.total ?? 0) };
  }

  async buscarPorId(id: bigint): Promise<LinhaResumoCliente | null> {
    const linhas = await this.prisma.$queryRaw<LinhaResumoCliente[]>`
      ${this.selecionar(this.montarSqlBase({ id }))}
    `;
    return linhas[0] ?? null;
  }
}
