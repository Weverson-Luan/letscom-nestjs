/**
 * IMPORTS
 */
import { Injectable } from '@nestjs/common';

// shared
import { resolvePagination } from 'src/shared/database/pagination';
import { buildPagination } from 'src/shared/utils/api-response';

// dto / repository / mappers
import { ListarUsuariosInternosQueryDto } from '../dto/listar-usuarios-internos-query.dto';
import { ListarUsuariosInternosRepository } from '../repositories/listar-usuarios-internos.repository';
import { mapearUsuarioInterno } from '../mappers/usuario-interno.mapper';

@Injectable()
export class ListarUsuariosInternosService {
  constructor(private readonly repository: ListarUsuariosInternosRepository) {}

  async execute(query: ListarUsuariosInternosQueryDto) {
    const { page, perPage, skip, take } = resolvePagination(
      query as unknown as Record<string, unknown>,
      10,
      100,
    );

    const { data, total } = await this.repository.paginar({
      search: query.search?.trim() || undefined,
      papel: query.papel,
      skip,
      take,
    });

    return {
      data: data.map(({ usuario, papel }) => mapearUsuarioInterno(usuario, papel)),
      pagination: buildPagination(total, page, perPage),
    };
  }
}
