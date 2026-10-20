import { Injectable } from '@nestjs/common';
import { AuthUser } from 'src/shared/decorators/current-user.decorator';
import { NotificacaoRepository } from '../repositories/notificacao.repository';
import {
  montarDestinatarioDoUsuario,
  montarFiltroDestinatario,
} from './helpers/destinatario-notificacao.helper';

/** Contador do sino (consultado em polling pelo backoffice — só um COUNT indexado). */
@Injectable()
export class ContarNotificacoesNaoLidasService {
  constructor(private readonly repository: NotificacaoRepository) {}

  async execute(usuario: AuthUser) {
    const naoLidas = await this.repository.contarNaoLidas(
      montarFiltroDestinatario(montarDestinatarioDoUsuario(usuario)),
    );
    return { nao_lidas: naoLidas };
  }
}
