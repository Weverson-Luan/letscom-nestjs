import { Injectable } from '@nestjs/common';
import { resolvePagination } from 'src/shared/database/pagination';
import { buildPagination } from 'src/shared/utils/api-response';
import { POR_PAGINA_MAXIMO_AGENDA, POR_PAGINA_PADRAO_AGENDA } from '../clientes-agenda.constants';
import { ListarAgendaQueryDto } from '../dto/listar-agenda-query.dto';
import { ClienteNaoEncontradoException } from '../exceptions/cliente-nao-encontrado.exception';
import { mapearCompromissoInterno } from '../mappers/compromisso-cliente.mapper';
import { ClienteCompromissoRepository } from '../repositories/cliente-compromisso.repository';
import { montarFiltrosAgenda } from './helpers/montar-filtros-agenda.helper';

/** Agenda do cliente vista pela equipe: todos os compromissos não excluídos, do mais próximo ao mais distante. */
@Injectable()
export class ListarCompromissosClienteService {
  constructor(private readonly repository: ClienteCompromissoRepository) {}

  async execute(clienteId: bigint, query: ListarAgendaQueryDto) {
    if (!(await this.repository.ehClienteAtivo(clienteId))) {
      throw new ClienteNaoEncontradoException();
    }

    const { page, perPage, skip, take } = resolvePagination(
      query as unknown as Record<string, unknown>,
      POR_PAGINA_PADRAO_AGENDA,
      POR_PAGINA_MAXIMO_AGENDA,
    );

    const { data, total } = await this.repository.paginar({
      clienteId,
      ...montarFiltrosAgenda(query),
      skip,
      take,
    });

    const agora = new Date();
    return {
      data: data.map((compromisso) => mapearCompromissoInterno(compromisso, agora)),
      pagination: buildPagination(total, page, perPage),
    };
  }
}
