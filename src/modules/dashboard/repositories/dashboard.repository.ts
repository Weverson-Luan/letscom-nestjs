import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { RoleUserRepository } from 'src/shared/repositories/role-user.repository';

const STATUS_CONCLUIDOS = ['concluida', 'concluído', 'concluido'];

type AtividadeRecente = {
  tipo: string;
  descricao: string;
  created_at: Date | string;
};

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

  async calcularTaxaSucesso(): Promise<number> {
    const [concluidas, canceladas] = await Promise.all([
      this.prisma.remessa.count({
        where: { deletedAt: null, status: { in: STATUS_CONCLUIDOS } },
      }),
      this.prisma.remessa.count({
        where: { deletedAt: null, status: 'cancelada' },
      }),
    ]);
    const total = concluidas + canceladas;
    if (total === 0) return 0;
    return Math.round((concluidas / total) * 1000) / 10;
  }

  async listarAtividadesRecentes(limit = 10) {
    const atividades: AtividadeRecente[] = [];

    const remessas = await this.prisma.remessa.findMany({
      where: { deletedAt: null },
      include: { cliente: { select: { id: true, nome: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    for (const remessa of remessas) {
      const sufixo = remessa.cliente?.nome
        ? ` por ${remessa.cliente.nome}`
        : '';
      atividades.push({
        tipo: 'remessa_criada',
        descricao: `Nova remessa #${remessa.numeroRemessa} criada${sufixo}.`,
        created_at: remessa.createdAt ?? new Date(),
      });
    }

    const statusLogs = await this.prisma.remessaStatus.findMany({
      include: { remessa: { select: { id: true, numeroRemessa: true } } },
      orderBy: { dataStatus: 'desc' },
      take: limit,
    });
    for (const log of statusLogs) {
      const numero =
        log.remessa?.numeroRemessa?.toString() ?? String(log.remessaId);
      atividades.push({
        tipo: 'status_alterado',
        descricao: `Remessa #${numero} avançou para ${log.status}.`,
        created_at: log.dataStatus,
      });
    }

    const lotesFotos = await this.prisma.$queryRaw<
      { remessa_id: bigint; created_at: Date; qtd: bigint }[]
    >`
      SELECT remessa_id, MAX(created_at) AS created_at, COUNT(*) AS qtd
      FROM remessa_fotos
      GROUP BY remessa_id
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;
    const remessaIds = lotesFotos.map((l) => l.remessa_id);
    const numeros = remessaIds.length
      ? await this.prisma.remessa.findMany({
          where: { id: { in: remessaIds } },
          select: { id: true, numeroRemessa: true },
        })
      : [];
    const numeroMap = new Map(
      numeros.map((r) => [r.id.toString(), r.numeroRemessa.toString()]),
    );
    for (const lote of lotesFotos) {
      const numero =
        numeroMap.get(lote.remessa_id.toString()) ?? String(lote.remessa_id);
      atividades.push({
        tipo: 'fotos_enviadas',
        descricao: `Lote com ${Number(lote.qtd)} fotos enviado para remessa #${numero}.`,
        created_at: lote.created_at,
      });
    }

    const clienteIds = await this.roleUserRepo.findRecentClientUserIds(limit);
    const clientes =
      clienteIds.length === 0
        ? []
        : await this.prisma.user.findMany({
            where: { id: { in: clienteIds } },
            orderBy: { createdAt: 'desc' },
          });
    for (const cliente of clientes) {
      atividades.push({
        tipo: 'cliente_cadastrado',
        descricao: `Novo cliente cadastrado: ${cliente.nome}.`,
        created_at: cliente.createdAt ?? new Date(),
      });
    }

    return atividades
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
      .slice(0, limit)
      .map((a) => ({
        tipo: a.tipo,
        descricao: a.descricao,
        created_at: new Date(a.created_at).toISOString(),
      }));
  }
}
