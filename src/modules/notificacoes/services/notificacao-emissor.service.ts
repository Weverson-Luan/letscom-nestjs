import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  cortarTexto,
  DadosNotificacao,
  DestinatarioNotificacao,
  TAMANHO_MAXIMO_MENSAGEM_NOTIFICACAO,
  TAMANHO_MAXIMO_TITULO_NOTIFICACAO,
} from '../notificacoes.constants';
import { NotificacaoRepository } from '../repositories/notificacao.repository';
import { removerDestinatariosRepetidos } from './helpers/destinatario-notificacao.helper';

/**
 * Service técnico (exportado): grava a mesma notificação para vários destinatários.
 * Recebe `tx` para entrar na transação de quem originou o evento.
 */
@Injectable()
export class NotificacaoEmissorService {
  constructor(private readonly repository: NotificacaoRepository) {}

  async emitir(
    destinatarios: DestinatarioNotificacao[],
    dados: DadosNotificacao,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const unicos = removerDestinatariosRepetidos(destinatarios);
    if (unicos.length === 0) return 0;

    const mensagem = cortarTexto(dados.mensagem, TAMANHO_MAXIMO_MENSAGEM_NOTIFICACAO);

    await this.repository.criarVarias(
      unicos.map((destinatario) => ({
        destinatarioUserId: 'userId' in destinatario ? destinatario.userId : null,
        destinatarioSubordinadoId:
          'subordinadoId' in destinatario ? destinatario.subordinadoId : null,
        tipo: dados.tipo,
        titulo: cortarTexto(dados.titulo, TAMANHO_MAXIMO_TITULO_NOTIFICACAO),
        mensagem,
        link: dados.link ?? null,
        anotacaoId: dados.anotacaoId ?? null,
        participanteId: dados.participanteId ?? null,
      })),
      tx,
    );
    return unicos.length;
  }
}
