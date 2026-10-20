import { Injectable } from '@nestjs/common';
import { DashboardRepository } from '../repositories/dashboard.repository';

/** Espelha DashboardService. Atividades recentes: GET /dashboard/atividades-recentes. */
@Injectable()
export class DashboardService {
  constructor(private readonly repository: DashboardRepository) {}

  async overview() {
    const [
      clientesAtivos,
      usuariosClienteAtivos,
      fotosProcessadas,
      taxaSucesso,
      remessasCanceladas,
    ] = await Promise.all([
      this.repository.contarClientesAtivos(),
      this.repository.contarUsuariosClienteAtivos(),
      this.repository.contarFotosProcessadas(),
      this.repository.calcularTaxaSucesso(),
      this.repository.contarRemessasCanceladas(),
    ]);

    return {
      clientes_ativos: clientesAtivos,
      usuarios_cliente_ativos: usuariosClienteAtivos,
      fotos_processadas: fotosProcessadas,
      taxa_sucesso: taxaSucesso,
      remessas_canceladas: remessasCanceladas,
    };
  }
}
