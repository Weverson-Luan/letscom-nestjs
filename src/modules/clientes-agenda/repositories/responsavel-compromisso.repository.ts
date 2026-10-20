import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { PAPEIS_RESPONSAVEL_COMPROMISSO } from '../clientes-agenda.constants';

/** `interno` e `cliente` são users.id; `subordinado` é users_cliente.id. */
export type TipoResponsavelCompromisso = 'interno' | 'cliente' | 'subordinado';

export type ResponsavelCompromisso = {
  tipo: TipoResponsavelCompromisso;
  id: bigint;
  nome: string | null;
  email: string;
  documento: string | null;
};

export type FiltrosResponsaveis = { clienteId: bigint; search?: string };

function escaparLike(texto: string): string {
  // escapa curingas do LIKE para que `_`/`%` digitados sejam buscados literalmente
  return `%${texto.replace(/[\\%_]/g, '\\$&')}%`;
}

/** Documento é gravado só com dígitos: "123.456.789-00" também encontra. */
function montarBusca(search?: string): Prisma.Sql {
  if (!search) return Prisma.empty;
  const busca = escaparLike(search);
  const digitos = search.replace(/\D/g, '');
  return Prisma.sql`AND (
    t.nome LIKE ${busca} OR t.email LIKE ${busca}
    ${digitos ? Prisma.sql`OR t.documento LIKE ${escaparLike(digitos)}` : Prisma.empty}
  )`;
}

/**
 * Quem pode ser responsável por um compromisso: equipe interna ativa, o próprio cliente e os
 * subordinados ativos dele (`role_user` é @@ignore, por isso SQL cru).
 */
@Injectable()
export class ResponsavelCompromissoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async ehUsuarioInternoAtivo(usuarioId: bigint): Promise<boolean> {
    const linhas = await this.prisma.$queryRaw<{ id: bigint }[]>`
      SELECT u.id
      FROM users u
      INNER JOIN role_user ru ON ru.user_id = u.id AND ru.ativo = 1
      INNER JOIN roles r ON r.id = ru.role_id
      WHERE u.id = ${usuarioId}
        AND u.ativo = 1
        AND u.deleted_at IS NULL
        AND LOWER(r.nome) IN (${Prisma.join([...PAPEIS_RESPONSAVEL_COMPROMISSO])})
      LIMIT 1
    `;
    return linhas.length > 0;
  }

  async ehSubordinadoAtivoDoCliente(clienteId: bigint, subordinadoId: bigint): Promise<boolean> {
    const subordinado = await this.prisma.userCliente.findFirst({
      where: { id: subordinadoId, clienteId, ativo: true },
      select: { id: true },
    });
    return subordinado !== null;
  }

  /**
   * Equipe primeiro, depois o cliente e os subordinados; cada grupo por nome (ou e-mail, sem nome).
   * O cliente segue o mesmo critério de `ehClienteAtivo` (sem filtrar `ativo`).
   */
  private montarCandidatos(clienteId: bigint): Prisma.Sql {
    return Prisma.sql`
      SELECT DISTINCT 'interno' AS tipo, 0 AS ordem, u.id, u.nome, u.email, u.documento
      FROM users u
      INNER JOIN role_user ru ON ru.user_id = u.id AND ru.ativo = 1
      INNER JOIN roles r ON r.id = ru.role_id
      WHERE u.ativo = 1
        AND u.deleted_at IS NULL
        AND u.id <> ${clienteId}
        AND LOWER(r.nome) IN (${Prisma.join([...PAPEIS_RESPONSAVEL_COMPROMISSO])})
      UNION ALL
      SELECT 'cliente', 1, u.id, u.nome, u.email, u.documento
      FROM users u
      WHERE u.id = ${clienteId} AND u.deleted_at IS NULL
      UNION ALL
      SELECT 'subordinado', 2, uc.id, uc.nome, uc.email, uc.documento
      FROM users_cliente uc
      WHERE uc.cliente_id = ${clienteId} AND uc.ativo = 1
    `;
  }

  async paginar(
    params: FiltrosResponsaveis & { skip: number; take: number },
  ): Promise<{ data: ResponsavelCompromisso[]; total: number }> {
    const candidatos = this.montarCandidatos(params.clienteId);
    const busca = montarBusca(params.search);
    const [data, contagem] = await Promise.all([
      this.prisma.$queryRaw<ResponsavelCompromisso[]>`
        SELECT t.tipo, t.id, t.nome, t.email, t.documento
        FROM (${candidatos}) t
        WHERE 1 = 1 ${busca}
        ORDER BY t.ordem ASC, COALESCE(t.nome, t.email) ASC, t.id ASC
        LIMIT ${params.take} OFFSET ${params.skip}
      `,
      this.prisma.$queryRaw<{ total: bigint }[]>`
        SELECT COUNT(*) AS total FROM (${candidatos}) t WHERE 1 = 1 ${busca}
      `,
    ]);
    return { data, total: Number(contagem[0]?.total ?? 0) };
  }
}
