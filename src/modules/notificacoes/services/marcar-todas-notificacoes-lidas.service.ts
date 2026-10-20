import { Injectable } from '@nestjs/common';
import { AuthUser } from 'src/shared/decorators/current-user.decorator';
import { NotificacaoRepository } from '../repositories/notificacao.repository';
import {
  montarDestinatarioDoUsuario,
  montarFiltroDestinatario,
} from './helpers/destinatario-notificacao.helper';

/** Marca como lidas todas as não lidas do usuário (botão "Marcar todas como lidas"). */
@Injectable()
export class MarcarTodasNotificacoesLidasService {
  constructor(private readonly repository: NotificacaoRepository) {}

  async execute(usuario: AuthUser) {
    const { count } = await this.repository.marcarTodasLidas(
      montarFiltroDestinatario(montarDestinatarioDoUsuario(usuario)),
    );
    return { marcadas: count };
  }
}
