/**
 * IMPORTS
 */
import { Injectable } from '@nestjs/common';

// shared / utils
import { resolvePagination } from 'src/shared/database/pagination';
import { buildPagination } from 'src/shared/utils/api-response';

// repository / mappers
import { ListarClientesRepository } from '../repositories/listar-clientes.repository';
import { UsersResponseMapper } from '../mappers/users-response.mapper';

/** Lista paginada dos usuários com papel 'cliente'. */
@Injectable()
export class ListarClientesService {
  constructor(
    private readonly repository: ListarClientesRepository,
    private readonly mapper: UsersResponseMapper,
  ) {}

  async execute(query: Record<string, unknown>) {
    const { page, perPage, skip, take } = resolvePagination(query, 10, 100);
    const { data, total } = await this.repository.paginar({
      search: query.search as string,
      sortBy: (query.sort_by as string) ?? 'createdAt',
      order: (query.order as 'asc' | 'desc') ?? 'desc',
      skip,
      take,
    });

    return {
      data: await this.mapper.mapUsersList(data),
      pagination: buildPagination(total, page, perPage),
    };
  }
}
