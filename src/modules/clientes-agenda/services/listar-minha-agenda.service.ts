import { Injectable } from '@nestjs/common';
import { resolvePagination } from 'src/shared/database/pagination';
import { AuthUser } from 'src/shared/decorators/current-user.decorator';
import { buildPagination } from 'src/shared/utils/api-response';
import { POR_PAGINA_MAXIMO_AGENDA, POR_PAGINA_PADRAO_AGENDA } from '../clientes-agenda.constants';
import { ListarAgendaQueryDto } from '../dto/listar-agenda-query.dto';
import { ClienteNaoEncontradoException } from '../exceptions/cliente-nao-encontrado.exception';
import { mapearCompromissoCliente } from '../mappers/compromisso-cliente.mapper';
import { ClienteCompromissoRepository } from '../repositories/cliente-compromisso.repository';
import { montarFiltrosAgenda } from './helpers/montar-filtros-agenda.helper';
import { exigirClienteIdDoUsuario } from './helpers/exigir-cliente-id-do-usuario.helper';

/** Agenda da empresa do cliente logado: só compromissos marcados como visíveis ao cliente. */
@Injectable()
export class ListarMinhaAgendaService {
  constructor(private readonly repository: ClienteCompromissoRepository) {}

  async execute(query: ListarAgendaQueryDto, usuario: AuthUser) {
    const clienteId = exigirClienteIdDoUsuario(usuario);
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
      somenteVisiveisCliente: true,
      ...montarFiltrosAgenda(query),
      skip,
      take,
    });

    const agora = new Date();
    return {
      data: data.map((compromisso) => mapearCompromissoCliente(compromisso, agora)),
      pagination: buildPagination(total, page, perPage),
    };
  }
}
