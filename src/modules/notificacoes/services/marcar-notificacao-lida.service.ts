import { Injectable } from '@nestjs/common';
import { AuthUser } from 'src/shared/decorators/current-user.decorator';
import { NotificacaoNaoEncontradaException } from '../exceptions/notificacao-nao-encontrada.exception';
import { mapearNotificacao } from '../mappers/notificacao.mapper';
import { NotificacaoRepository } from '../repositories/notificacao.repository';
import {
  montarDestinatarioDoUsuario,
  montarFiltroDestinatario,
} from './helpers/destinatario-notificacao.helper';

/** Marca uma notificação do próprio usuário como lida (idempotente). */
@Injectable()
export class MarcarNotificacaoLidaService {
  constructor(private readonly repository: NotificacaoRepository) {}

  async execute(id: bigint, usuario: AuthUser) {
    const filtro = montarFiltroDestinatario(montarDestinatarioDoUsuario(usuario));
    const notificacao = await this.repository.buscarDoDestinatario(id, filtro);
    if (!notificacao) throw new NotificacaoNaoEncontradaException();
    if (notificacao.lidaEm) return mapearNotificacao(notificacao);

    return mapearNotificacao(await this.repository.marcarLida(id));
  }
}
