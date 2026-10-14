import { Injectable } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { PAPEIS_INTERNOS, PapelInterno } from '../usuarios-internos.constants';

export type UsuarioInternoComPapel = { usuario: User; papel: PapelInterno };

type FiltrosListagem = { search?: string; papel?: PapelInterno };

/**
 * Usuário interno = não excluído, com papel ativo em consultor/producao/recepcao
 * e nenhum papel ativo fora dessa lista (admin ou cliente não entram).
 * `role_user` não tem PK (@@ignore no Prisma), por isso SQL cru.
 */
@Injectable()
export class UsuarioInternoRepository {
  constructor(private readonly prisma: PrismaService) {}

  private montarSqlBase(filtros: FiltrosListagem & { id?: bigint }): Prisma.Sql {
    const papeis = Prisma.join([...PAPEIS_INTERNOS]);
    const busca = filtros.search ? `%${filtros.search}%` : null;

    return Prisma.sql`
      FROM users u
      INNER JOIN role_user ru ON ru.user_id = u.id AND ru.ativo = 1
      INNER JOIN roles r ON r.id = ru.role_id
      WHERE u.deleted_at IS NULL
        AND LOWER(r.nome) IN (${papeis})
        AND NOT EXISTS (
          SELECT 1 FROM role_user ru2
          INNER JOIN roles r2 ON r2.id = ru2.role_id
          WHERE ru2.user_id = u.id AND ru2.ativo = 1 AND LOWER(r2.nome) NOT IN (${papeis})
        )
        ${filtros.id ? Prisma.sql`AND u.id = ${filtros.id}` : Prisma.empty}
        ${filtros.papel ? Prisma.sql`AND LOWER(r.nome) = ${filtros.papel}` : Prisma.empty}
        ${
          busca
            ? Prisma.sql`AND (u.nome LIKE ${busca} OR u.email LIKE ${busca}
                OR u.telefone LIKE ${busca} OR u.documento LIKE ${busca})`
            : Prisma.empty
        }
    `;
  }

  private async carregarComPapel(
    linhas: { id: bigint; papel: string }[],
  ): Promise<UsuarioInternoComPapel[]> {
    if (linhas.length === 0) return [];
    const usuarios = await this.prisma.user.findMany({
      where: { id: { in: linhas.map((linha) => linha.id) } },
    });
    const porId = new Map(usuarios.map((usuario) => [usuario.id.toString(), usuario]));

    return linhas
      .map((linha) => ({
        usuario: porId.get(linha.id.toString()),
        papel: linha.papel.toLowerCase() as PapelInterno,
      }))
      .filter((item): item is UsuarioInternoComPapel => item.usuario !== undefined);
  }

  async paginar(params: FiltrosListagem & { skip: number; take: number }) {
    const base = this.montarSqlBase(params);

    const [linhas, contagem] = await Promise.all([
      this.prisma.$queryRaw<{ id: bigint; papel: string }[]>`
        SELECT u.id, MIN(LOWER(r.nome)) AS papel
        ${base}
        GROUP BY u.id, u.created_at
        ORDER BY u.created_at DESC, u.id DESC
        LIMIT ${params.take} OFFSET ${params.skip}
      `,
      this.prisma.$queryRaw<[{ total: bigint }]>`
        SELECT COUNT(DISTINCT u.id) AS total
        ${base}
      `,
    ]);

    return {
      data: await this.carregarComPapel(linhas),
      total: Number(contagem[0]?.total ?? 0),
    };
  }

  async buscarPorId(id: bigint): Promise<UsuarioInternoComPapel | null> {
    const linhas = await this.prisma.$queryRaw<{ id: bigint; papel: string }[]>`
      SELECT u.id, MIN(LOWER(r.nome)) AS papel
      ${this.montarSqlBase({ id })}
      GROUP BY u.id
    `;
    const [encontrado] = await this.carregarComPapel(linhas);
    return encontrado ?? null;
  }

  buscarIdPapel(papel: PapelInterno, tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).role.findUnique({ where: { nome: papel }, select: { id: true } });
  }

  criar(data: Prisma.UserCreateInput, tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).user.create({ data });
  }

  atualizar(id: bigint, data: Prisma.UserUpdateInput, tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).user.update({ where: { id }, data });
  }
}
