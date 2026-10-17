import { Injectable } from '@nestjs/common';
import { resolvePagination } from 'src/shared/database/pagination';
import { AuthUser } from 'src/shared/decorators/current-user.decorator';
import { buildPagination } from 'src/shared/utils/api-response';
import { ListarNotificacoesQueryDto } from '../dto/listar-notificacoes-query.dto';
import { mapearNotificacao } from '../mappers/notificacao.mapper';
import { NotificacaoRepository } from '../repositories/notificacao.repository';
import {
  montarDestinatarioDoUsuario,
  montarFiltroDestinatario,
} from './helpers/destinatario-notificacao.helper';

/** Caixa de notificações do usuário logado, mais recentes primeiro, com total de não lidas. */
@Injectable()
export class ListarNotificacoesService {
  constructor(private readonly repository: NotificacaoRepository) {}

  async execute(query: ListarNotificacoesQueryDto, usuario: AuthUser) {
    const { page, perPage, skip, take } = resolvePagination(
      query as unknown as Record<string, unknown>,
      10,
      50,
    );
    const filtro = montarFiltroDestinatario(montarDestinatarioDoUsuario(usuario));
    const apenasNaoLidas = query.apenas_nao_lidas === '1' || query.apenas_nao_lidas === 'true';

    const [{ data, total }, naoLidas] = await Promise.all([
      this.repository.paginar({ filtro, apenasNaoLidas, skip, take }),
      this.repository.contarNaoLidas(filtro),
    ]);

    return {
      data: data.map(mapearNotificacao),
      pagination: buildPagination(total, page, perPage),
      nao_lidas: naoLidas,
    };
  }
}
