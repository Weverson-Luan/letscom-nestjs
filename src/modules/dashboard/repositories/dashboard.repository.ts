import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { RoleUserRepository } from 'src/shared/repositories/role-user.repository';

const STATUS_CONCLUIDOS = ['concluida', 'concluído', 'concluido'];
const STATUS_CANCELADA = 'cancelada';

export type TipoAtividadeRecente =
  'remessa_criada' | 'status_alterado' | 'fotos_enviadas' | 'cliente_cadastrado';

/** Linha crua devolvida pela UNION do DashboardRepository. */
export interface AtividadeRecenteBruta {
  tipo: TipoAtividadeRecente;
  /** número da remessa (remessa_criada, status_alterado, fotos_enviadas) */
  numero: bigint | number | string | null;
  /** etapa (status_alterado) */
  status: string | null;
  /** nome do cliente (remessa_criada, cliente_cadastrado) ou do autor (status_alterado) */
  nome: string | null;
  /** quantidade de fotos do lote (fotos_enviadas) */
  quantidade: bigint | number | null;
  created_at: Date | string | null;
}

/** Usuário (alias `u`) ativo, não excluído e com o papel 'cliente' ativo. */
const FILTRO_CLIENTE_ATIVO = Prisma.sql`
  u.ativo = 1
  AND u.deleted_at IS NULL
  AND EXISTS (
    SELECT 1
    FROM role_user ru
    INNER JOIN roles papel ON papel.id = ru.role_id
    WHERE ru.user_id = u.id AND ru.ativo = 1 AND LOWER(papel.nome) = 'cliente'
  )
`;

/** Espelha DashboardRepository — métricas do overview. */
@Injectable()
export class DashboardRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly roleUserRepo: RoleUserRepository,
  ) {}

  contarClientesAtivos() {
    return this.roleUserRepo.countUsersWithRole('cliente', true);
  }

  contarUsuariosClienteAtivos() {
    return this.prisma.userCliente.count({ where: { ativo: true } });
  }

  contarFotosProcessadas() {
    return this.prisma.remessaFoto.count();
  }

  contarRemessasCanceladas() {
    return this.prisma.remessa.count({ where: { deletedAt: null, status: STATUS_CANCELADA } });
  }

  async calcularTaxaSucesso(): Promise<number> {
    const [concluidas, canceladas] = await Promise.all([
      this.prisma.remessa.count({
        where: { deletedAt: null, status: { in: STATUS_CONCLUIDOS } },
      }),
      this.contarRemessasCanceladas(),
    ]);
    const total = concluidas + canceladas;
    if (total === 0) return 0;
    return Math.round((concluidas / total) * 1000) / 10;
  }

  /**
   * Atividades recentes paginadas no banco: UNION ALL das 4 fontes (remessas criadas, mudanças de
   * status, lotes de fotos por remessa e clientes cadastrados), ordenada por data desc com desempate
   * determinístico (ordem do tipo + id desc). Cada fonte já vem ordenada e cortada em skip + take
   * (o top-N da união está contido no top-N de cada fonte), então o sort externo fica limitado a
   * 4 × (skip + take) linhas. Devolve linhas cruas — o texto é montado no mapper.
   */
  async paginarAtividadesRecentes(
    skip: number,
    take: number,
  ): Promise<{ data: AtividadeRecenteBruta[]; total: number }> {
    const limiteFonte = skip + take;
    const [data, [contagem]] = await Promise.all([
      this.prisma.$queryRaw<AtividadeRecenteBruta[]>`
        SELECT atividades.tipo, atividades.numero, atividades.status, atividades.nome,
               atividades.quantidade, atividades.created_at
        FROM (
          (SELECT 'remessa_criada' AS tipo, 1 AS ordem, r.id AS referencia_id,
                  r.numero_remessa AS numero, NULL AS status, c.nome AS nome, NULL AS quantidade,
                  COALESCE(r.created_at, CURRENT_TIMESTAMP) AS created_at
           FROM remessas r
           LEFT JOIN users c ON c.id = r.cliente_id
           WHERE r.deleted_at IS NULL
           ORDER BY COALESCE(r.created_at, CURRENT_TIMESTAMP) DESC, r.id DESC
           LIMIT ${limiteFonte})

          UNION ALL

          (SELECT 'status_alterado', 2, rs.id, COALESCE(r.numero_remessa, rs.remessa_id), rs.status,
                  u.nome, NULL, rs.data_status
           FROM remessas_status rs
           LEFT JOIN remessas r ON r.id = rs.remessa_id
           LEFT JOIN users u ON u.id = rs.user_id
           ORDER BY rs.data_status DESC, rs.id DESC
           LIMIT ${limiteFonte})

          UNION ALL

          (SELECT 'fotos_enviadas', 3, lotes.remessa_id, COALESCE(r.numero_remessa, lotes.remessa_id),
                  NULL, NULL, lotes.quantidade, lotes.created_at
           FROM (
             SELECT remessa_id, MAX(created_at) AS created_at, COUNT(*) AS quantidade
             FROM remessa_fotos
             GROUP BY remessa_id
           ) lotes
           LEFT JOIN remessas r ON r.id = lotes.remessa_id
           ORDER BY lotes.created_at DESC, lotes.remessa_id DESC
           LIMIT ${limiteFonte})

          UNION ALL

          (SELECT 'cliente_cadastrado', 4, u.id, NULL, NULL, u.nome, NULL,
                  COALESCE(u.created_at, CURRENT_TIMESTAMP)
           FROM users u
           WHERE ${FILTRO_CLIENTE_ATIVO}
           ORDER BY COALESCE(u.created_at, CURRENT_TIMESTAMP) DESC, u.id DESC
           LIMIT ${limiteFonte})
        ) atividades
        ORDER BY atividades.created_at DESC, atividades.ordem ASC, atividades.referencia_id DESC
        LIMIT ${take} OFFSET ${skip}
      `,
      this.prisma.$queryRaw<{ total: bigint | number | null }[]>`
        SELECT
          (SELECT COUNT(*) FROM remessas WHERE deleted_at IS NULL)
          + (SELECT COUNT(*) FROM remessas_status)
          + (SELECT COUNT(DISTINCT remessa_id) FROM remessa_fotos)
          + (SELECT COUNT(*) FROM users u WHERE ${FILTRO_CLIENTE_ATIVO}) AS total
      `,
    ]);

    return { data, total: Number(contagem?.total ?? 0) };
  }
}
