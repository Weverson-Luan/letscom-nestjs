import { Injectable } from '@nestjs/common';
import { buildPagination, Pagination } from 'src/shared/utils/api-response';
import { ListarAtividadesRecentesQueryDto } from '../dto/listar-atividades-recentes-query.dto';
import {
  AtividadeRecenteResposta,
  mapearAtividadeRecente,
} from '../mappers/atividade-recente.mapper';
import { DashboardRepository } from '../repositories/dashboard.repository';

/** Lista as atividades recentes do dashboard, paginadas no banco. */
@Injectable()
export class ListarAtividadesRecentesDashboardService {
  constructor(private readonly repository: DashboardRepository) {}

  async execute(
    query: ListarAtividadesRecentesQueryDto,
  ): Promise<{ data: AtividadeRecenteResposta[]; pagination: Pagination }> {
    const { page, per_page: porPagina } = query;
    const { data, total } = await this.repository.paginarAtividadesRecentes(
      (page - 1) * porPagina,
      porPagina,
    );

    return {
      data: data.map(mapearAtividadeRecente),
      pagination: buildPagination(total, page, porPagina),
    };
  }
}
