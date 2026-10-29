/**
 * IMPORTS
 */
import { Injectable } from '@nestjs/common';

// shared / utils
import { resolvePagination } from 'src/shared/database/pagination';
import { buildPagination } from 'src/shared/utils/api-response';

// repository / mappers
import { ListarUsuariosDoClienteRepository } from '../repositories/listar-usuarios-do-cliente.repository';
import { mapUserCliente } from '../mappers/user-cliente.mapper';

/** Lista paginada dos usuários subordinados de um cliente. */
@Injectable()
export class ListarUsuariosDoClienteService {
  constructor(private readonly repository: ListarUsuariosDoClienteRepository) {}

  async execute(clienteId: bigint, query: Record<string, unknown>) {
    const { page, perPage, skip, take } = resolvePagination(query, 10, 100);
    const { data, total } = await this.repository.paginarPorCliente({
      clienteId,
      busca: query.search as string,
      campoOrdenacao: query.sort_by as string,
      direcao: (query.order as 'asc' | 'desc') ?? 'desc',
      skip,
      take,
    });

    return {
      data: data.map(mapUserCliente),
      pagination: buildPagination(total, page, perPage),
    };
  }
}
