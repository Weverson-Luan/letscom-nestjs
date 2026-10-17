import { Injectable } from '@nestjs/common';
import { resolvePagination } from 'src/shared/database/pagination';
import { PaginationQueryDto } from 'src/shared/dto/pagination-query.dto';
import { buildPagination } from 'src/shared/utils/api-response';
import { mapearResumoClienteAnotacoes } from '../mappers/resumo-cliente-anotacoes.mapper';
import { ClienteResumoAnotacoesRepository } from '../repositories/cliente-resumo-anotacoes.repository';

/** Clientes para escolher de quem abrir as anotações, com o resumo do último contato. */
@Injectable()
export class ListarClientesAnotacoesService {
  constructor(private readonly repository: ClienteResumoAnotacoesRepository) {}

  async execute(query: PaginationQueryDto) {
    const { page, perPage, skip, take } = resolvePagination(
      query as unknown as Record<string, unknown>,
      10,
      100,
    );

    const { data, total } = await this.repository.paginar({
      search: query.search?.trim() || undefined,
      skip,
      take,
    });

    return {
      data: data.map(mapearResumoClienteAnotacoes),
      pagination: buildPagination(total, page, perPage),
    };
  }
}
