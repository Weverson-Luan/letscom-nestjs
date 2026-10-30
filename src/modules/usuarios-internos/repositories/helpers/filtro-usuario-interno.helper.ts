/**
 * IMPORTS
 */
import { Prisma, User } from '@prisma/client';

// constants
import { PAPEIS_INTERNOS, PapelInterno } from '../../usuarios-internos.constants';

export type UsuarioInternoComPapel = { usuario: User; papel: PapelInterno };

export type LinhaUsuarioInterno = { id: bigint; papel: string };

export type FiltrosUsuarioInterno = { id?: bigint; search?: string; papel?: PapelInterno };

/**
 * FROM/WHERE de "usuário interno": não excluído, com papel ativo em consultor/producao/recepcao
 * e nenhum papel ativo fora dessa lista (admin ou cliente não entram).
 * `role_user` não tem PK (@@ignore no Prisma), por isso SQL cru.
 */
export function montarFiltroUsuarioInterno(filtros: FiltrosUsuarioInterno): Prisma.Sql {
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

/** Junta as linhas (id + papel) do SQL cru aos usuários do Prisma, mantendo a ordem das linhas. */
export function combinarUsuariosComPapel(
  linhas: LinhaUsuarioInterno[],
  usuarios: User[],
): UsuarioInternoComPapel[] {
  const porId = new Map(usuarios.map((usuario) => [usuario.id.toString(), usuario]));

  return linhas
    .map((linha) => ({
      usuario: porId.get(linha.id.toString()),
      papel: linha.papel.toLowerCase() as PapelInterno,
    }))
    .filter((item): item is UsuarioInternoComPapel => item.usuario !== undefined);
}
