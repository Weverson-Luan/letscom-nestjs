import { Injectable } from '@nestjs/common';
import { resolvePagination } from 'src/shared/database/pagination';
import { AuthUser } from 'src/shared/decorators/current-user.decorator';
import { buildPagination } from 'src/shared/utils/api-response';
import { ListarAnotacoesClienteQueryDto } from '../dto/listar-anotacoes-cliente-query.dto';
import { ClienteNaoEncontradoException } from '../exceptions/cliente-nao-encontrado.exception';
import { mapearAnotacaoCliente } from '../mappers/anotacao-cliente.mapper';
import { ClienteAnotacaoRepository } from '../repositories/cliente-anotacao.repository';

/** Linha do tempo do cliente, da mais recente para a mais antiga. */
@Injectable()
export class ListarAnotacoesClienteService {
  constructor(private readonly repository: ClienteAnotacaoRepository) {}

  async execute(clienteId: bigint, query: ListarAnotacoesClienteQueryDto, usuario: AuthUser) {
    if (!(await this.repository.ehClienteAtivo(clienteId))) {
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
