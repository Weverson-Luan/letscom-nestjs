import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { StorageService } from 'src/shared/storage/storage.service';
import { serializeUser } from 'src/modules/auth/mappers/auth-response.mapper';

const STEP_LABELS: Record<string, { id: number; label: string; color: string }> = {
  envio_de_dados: { id: 1, label: 'Envio de Dados', color: 'bg-gray-300' },
  em_producao: { id: 2, label: 'Em Produção', color: 'bg-gray-300' },
  conferido: { id: 3, label: 'Expedição', color: 'bg-gray-300' },
  pedido_liberado: { id: 4, label: 'Pedido Liberado', color: 'bg-gray-300' },
  concluido: { id: 5, label: 'Finalizado', color: 'bg-gray-300' },
};

/**
 * Espelha o RemessasResponseHelper::mapRemessas: monta o payload de cada remessa
 * com steps de status, URLs de mídia, prazo (dias úteis) e contexto (liberação
 * de expedição e tipo de entrega do cliente).
 */
@Injectable()
export class RemessasResponseMapper {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async mapRemessas(remessas: any[], incluirFotos = false): Promise<any[]> {
    if (remessas.length === 0) return [];

    const remessaIds = remessas.map((r) => r.id);
    const clienteIds = [...new Set(remessas.map((r) => r.clienteId))];

    const [liberacoes, tiposEntrega] = await Promise.all([
      this.prisma.remessaLiberadaBalcao.findMany({ where: { remessaId: { in: remessaIds } } }),
      this.prisma.tipoEntregaUser.findMany({ where: { clienteId: { in: clienteIds } } }),
    ]);

    const liberacaoPorRemessa = new Map(liberacoes.map((l) => [l.remessaId.toString(), l]));
    const tipoEntregaPorCliente = new Map(tiposEntrega.map((t) => [t.clienteId.toString(), t]));

    const result: any[] = [];
    for (const remessa of remessas) {
      result.push(
        await this.mapItem(remessa, incluirFotos, liberacaoPorRemessa, tipoEntregaPorCliente),
      );
    }
    return result;
  }

  private async mapItem(
    remessa: any,
    incluirFotos: boolean,
    liberacaoPorRemessa: Map<string, any>,
    tipoEntregaPorCliente: Map<string, any>,
  ) {
    const liberacaoExpedicao = liberacaoPorRemessa.get(remessa.id.toString()) ?? null;
    const prazo = this.diffWeekdays(new Date(remessa.createdAt), new Date());

    const statusLogsByStatus = new Map(
      (remessa.statusLogs ?? []).map((log: any) => [log.status, log]),
    );
    const steps = Object.entries(STEP_LABELS).map(([status, info]) => {
      const log = statusLogsByStatus.get(status) as any;
      return {
        id: info.id,
        label: info.label,
        color: log ? 'bg-green-500' : info.color,
        active: !!log,
        date: log ? this.formatDate(new Date(log.dataStatus)) : null,
      };
    });

    const modelo = remessa.modeloTecnico ?? null;
    if (modelo) {
      modelo.foto_frente_url = modelo.fotoFrentePath
        ? await this.storage.getSignedUrl(modelo.fotoFrentePath)
        : null;
      modelo.foto_verso_url = modelo.fotoVersoPath
        ? await this.storage.getSignedUrl(modelo.fotoVersoPath)
        : null;
    }

    let fotos: any[] | null = null;
    if (incluirFotos && Array.isArray(remessa.fotos)) {
      fotos = [];
      for (const foto of remessa.fotos) {
        if (!foto.filePath) continue;
        fotos.push({
          id: foto.id,
          nome: foto.nome,
          matricula: foto.matricula,
          file_path: foto.filePath,
          url: await this.storage.getSignedUrl(foto.filePath),
          created_at: this.formatDateTime(new Date(foto.createdAt)),
        });
      }
    }

    const solicitante = remessa.usersSolicitanteSubordinadoId
      ? (remessa.solicitanteSubordinado ?? null)
      : (remessa.solicitante ?? null);

    return {
      id: remessa.id,
      total_solicitacoes: remessa.totalSolicitacoes,
      situacao: remessa.situacao,
      status: remessa.status,
      data_inicio_producao: remessa.dataInicioProducao,
      data_fim_producao: remessa.dataFimProducao,
      posicao: remessa.posicao,
      prazo,
      cliente: serializeUser(remessa.cliente ?? null),
      solicitante: serializeUser(solicitante),
      consultor: serializeUser(remessa.consultor ?? null),
      designer: serializeUser(remessa.executor ?? null),
      tecnologia: remessa.tecnologia ?? null,
      modelo_tecnico: modelo,
      historico_status_remessa: steps,
      observacao: remessa.observacao ?? null,
      numero_remessa: remessa.numeroRemessa,
      items_remessa: fotos,
      is_provisorio: Boolean(modelo?.isProvisorio),
      tipo_entrega: tipoEntregaPorCliente.get(remessa.clienteId.toString()) ?? null,
      liberacao_expedicao: liberacaoExpedicao
        ? {
            tipo_entrega_id: liberacaoExpedicao.tipoEntregaId,
            observacao: liberacaoExpedicao.observacao,
            outros: liberacaoExpedicao.outros,
          }
        : null,
      created_at: remessa.createdAt,
      updated_at: remessa.updatedAt,
    };
  }

  /** Dias úteis entre duas datas (aprox. diffInWeekdays do Carbon). */
  private diffWeekdays(start: Date, end: Date): number {
    if (end < start) return 0;
    let count = 0;
    const cursor = new Date(start);
    cursor.setHours(0, 0, 0, 0);
    const target = new Date(end);
    target.setHours(0, 0, 0, 0);
    while (cursor < target) {
      cursor.setDate(cursor.getDate() + 1);
      const day = cursor.getDay();
      if (day !== 0 && day !== 6) count++;
    }
    return count;
  }

  private formatDate(d: Date): string {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} às ${hh}:${mi}`;
  }

  private formatDateTime(d: Date): string {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
  }
}
