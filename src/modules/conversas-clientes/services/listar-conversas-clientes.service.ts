import { Injectable } from '@nestjs/common';
import { resolvePagination } from 'src/shared/database/pagination';
import { PaginationQueryDto } from 'src/shared/dto/pagination-query.dto';
import { buildPagination } from 'src/shared/utils/api-response';
import { mapearResumoConversaCliente } from '../mappers/resumo-conversa-cliente.mapper';
import { ConversaClienteResumoRepository } from '../repositories/conversa-cliente-resumo.repository';

/** Clientes para escolher de quem abrir as mensagens, com o resumo do último contato. */
@Injectable()
export class ListarConversasClientesService {
  constructor(private readonly repository: ConversaClienteResumoRepository) {}

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
      data: data.map(mapearResumoConversaCliente),
      pagination: buildPagination(total, page, perPage),
    };
  }
}
