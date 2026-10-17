import { Injectable } from '@nestjs/common';
import { resolvePagination } from 'src/shared/database/pagination';
import { AuthUser } from 'src/shared/decorators/current-user.decorator';
import { buildPagination } from 'src/shared/utils/api-response';
import { ListarAnotacoesClienteQueryDto } from '../dto/listar-anotacoes-cliente-query.dto';
import { ClienteNaoEncontradoException } from '../exceptions/cliente-nao-encontrado.exception';
import { mapearAnotacaoCliente } from '../mappers/anotacao-cliente.mapper';
import { ClienteAnotacaoRepository } from '../repositories/cliente-anotacao.repository';
import { extrairClienteIdDoUsuario } from './helpers/resolver-usuario-anotacao.helper';

/** Conversa da empresa do cliente logado (cliente principal ou subordinado): todo o histórico. */
@Injectable()
export class ListarMinhasAnotacoesService {
  constructor(private readonly repository: ClienteAnotacaoRepository) {}

  async execute(query: ListarAnotacoesClienteQueryDto, usuario: AuthUser) {
    const clienteId = extrairClienteIdDoUsuario(usuario);
    if (!clienteId || !(await this.repository.ehClienteAtivo(clienteId))) {
      throw new ClienteNaoEncontradoException();
    }

    const { page, perPage, skip, take } = resolvePagination(
      query as unknown as Record<string, unknown>,
      20,
      50,
    );

    const { data, total } = await this.repository.paginar({
      clienteId,
      tipo: query.tipo,
      search: query.search?.trim() || undefined,
      skip,
      take,
    });

    return {
      data: data.map((anotacao) => mapearAnotacaoCliente(anotacao, usuario)),
      pagination: buildPagination(total, page, perPage),
    };
  }
}
