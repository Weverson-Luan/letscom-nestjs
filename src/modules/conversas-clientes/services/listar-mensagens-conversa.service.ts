import { Injectable } from '@nestjs/common';
import { resolvePagination } from 'src/shared/database/pagination';
import { AuthUser } from 'src/shared/decorators/current-user.decorator';
import { buildPagination } from 'src/shared/utils/api-response';
import { PaginationQueryDto } from 'src/shared/dto/pagination-query.dto';
import { ClienteNaoEncontradoException } from '../exceptions/cliente-nao-encontrado.exception';
import { mapearMensagemConversa } from '../mappers/mensagem-conversa.mapper';
import { ConversaMensagemRepository } from '../repositories/conversa-mensagem.repository';
import { ConversaAcessoService } from './conversa-acesso.service';
import { calcularVisivelDesde } from './helpers/participante-conversa.helper';

/**
 * Mensagens da conversa do cliente, da mais recente para a mais antiga (só para quem participa;
 * o convidado vê a partir de quando entrou).
 */
@Injectable()
export class ListarMensagensConversaService {
  constructor(
    private readonly repository: ConversaMensagemRepository,
    private readonly acesso: ConversaAcessoService,
  ) {}

  async execute(clienteId: bigint, query: PaginationQueryDto, usuario: AuthUser) {
    if (!(await this.repository.ehClienteAtivo(clienteId))) {
      throw new ClienteNaoEncontradoException();
    }
    const acesso = await this.acesso.garantirAcesso(clienteId, usuario);

    const { page, perPage, skip, take } = resolvePagination(
      query as unknown as Record<string, unknown>,
      20,
      50,
    );

    const { data, total } = await this.repository.paginar({
      clienteId,
      search: query.search?.trim() || undefined,
      visivelDesde: calcularVisivelDesde(acesso, clienteId, usuario),
      skip,
      take,
    });

    return {
      data: data.map((mensagem) => mapearMensagemConversa(mensagem, usuario)),
      pagination: buildPagination(total, page, perPage),
    };
  }
}
