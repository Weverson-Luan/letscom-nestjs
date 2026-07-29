import { Injectable } from '@nestjs/common';
import { mapActivityLog } from '../mappers/activity-log.mapper';
import { ActivityLogRepository } from '../repositories/activity-log.repository';
import { DashboardRepository } from '../repositories/dashboard.repository';

/** Espelha DashboardService + ActivityLogService (listagem). */
@Injectable()
export class DashboardService {
  constructor(
    private readonly repository: DashboardRepository,
    private readonly activityLogRepo: ActivityLogRepository,
  ) {}

  async overview() {
    const [
      clientesAtivos,
      usuariosClienteAtivos,
      fotosProcessadas,
      taxaSucesso,
      atividadesRecentes,
    ] = await Promise.all([
      this.repository.contarClientesAtivos(),
      this.repository.contarUsuariosClienteAtivos(),
      this.repository.contarFotosProcessadas(),
      this.repository.calcularTaxaSucesso(),
      this.repository.listarAtividadesRecentes(10),
    ]);

    return {
      clientes_ativos: clientesAtivos,
      usuarios_cliente_ativos: usuariosClienteAtivos,
      fotos_processadas: fotosProcessadas,
      taxa_sucesso: taxaSucesso,
      atividades_recentes: atividadesRecentes,
    };
  }

  async listarAtividades(query: Record<string, unknown>) {
    const { data, pagination } = await this.activityLogRepo.listar(query);
    return {
      data: data.map(mapActivityLog),
      pagination,
    };
  }
}
