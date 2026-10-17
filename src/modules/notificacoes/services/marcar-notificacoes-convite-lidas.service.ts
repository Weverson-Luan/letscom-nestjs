import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { NotificacaoRepository } from '../repositories/notificacao.repository';

/**
 * Service técnico (exportado): quando o convite para a conversa é respondido, as notificações
 * dele saem da caixa de não lidas. Recebe `tx` para entrar na transação da resposta.
 */
@Injectable()
export class MarcarNotificacoesConviteLidasService {
  constructor(private readonly repository: NotificacaoRepository) {}

  async execute(participanteId: bigint, tx?: Prisma.TransactionClient): Promise<number> {
    const { count } = await this.repository.marcarLidasDoParticipante(participanteId, tx);
    return count;
  }
}
