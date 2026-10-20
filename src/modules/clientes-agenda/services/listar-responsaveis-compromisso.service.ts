import { Injectable } from '@nestjs/common';
import { resolvePagination } from 'src/shared/database/pagination';
import { buildPagination } from 'src/shared/utils/api-response';
import {
  POR_PAGINA_MAXIMO_RESPONSAVEIS,
  POR_PAGINA_PADRAO_RESPONSAVEIS,
} from '../clientes-agenda.constants';
import { ListarResponsaveisQueryDto } from '../dto/listar-responsaveis-query.dto';
import { ClienteNaoEncontradoException } from '../exceptions/cliente-nao-encontrado.exception';
import { mapearResponsavelCompromisso } from '../mappers/responsavel-compromisso.mapper';
import { ClienteCompromissoRepository } from '../repositories/cliente-compromisso.repository';
import { ResponsavelCompromissoRepository } from '../repositories/responsavel-compromisso.repository';

/** Quem pode ser responsável por um compromisso (equipe, o cliente e os subordinados), paginado. */
@Injectable()
export class ListarResponsaveisCompromissoService {
  constructor(
    private readonly compromissoRepository: ClienteCompromissoRepository,
    private readonly repository: ResponsavelCompromissoRepository,
  ) {}

  async execute(clienteId: bigint, query: ListarResponsaveisQueryDto) {
    if (!(await this.compromissoRepository.ehClienteAtivo(clienteId))) {
      throw new ClienteNaoEncontradoException();
    }

    const { page, perPage, skip, take } = resolvePagination(
      query as unknown as Record<string, unknown>,
      POR_PAGINA_PADRAO_RESPONSAVEIS,
      POR_PAGINA_MAXIMO_RESPONSAVEIS,
    );

    const { data, total } = await this.repository.paginar({
      clienteId,
      search: query.search?.trim() || undefined,
      skip,
      take,
    });

    return {
      data: data.map(mapearResponsavelCompromisso),
      pagination: buildPagination(total, page, perPage),
    };
  }
}
