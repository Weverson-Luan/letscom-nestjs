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
import { extrairClienteIdDoUsuario } from './helpers/resolver-usuario-conversa.helper';

/**
 * Conversa da empresa do cliente logado (dono ou convidado com convite aceito). O dono vê todo o
 * histórico; o convidado, só a partir de quando entrou.
 */
@Injectable()
export class ListarMinhasMensagensConversaService {
  constructor(
    private readonly repository: ConversaMensagemRepository,
    private readonly acesso: ConversaAcessoService,
  ) {}

  async execute(query: PaginationQueryDto, usuario: AuthUser) {
    const clienteId = extrairClienteIdDoUsuario(usuario);
    if (!clienteId || !(await this.repository.ehClienteAtivo(clienteId))) {
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
