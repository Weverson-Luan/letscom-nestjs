/**
 * IMPORTS
 */
import { Injectable } from '@nestjs/common';

// services / conversa-participante
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { MarcarNotificacoesConviteLidasService } from 'src/modules/notificacoes/services/marcar-notificacoes-convite-lidas.service';

// repositories / conversa-participante
import {
  ConversaParticipanteRepository,
  ParticipanteComPessoa,
} from '../repositories/conversa-participante.repository';

import { ParticipanteConversaInvalidoException } from '../exceptions/participante-conversa-invalido.exception';
import { mapearParticipanteConversa } from '../mappers/participante-conversa.mapper';

// helpers / conversa
import { validarConvitePendenteDoUsuario } from './helpers/participante-conversa.helper';

// shared / decorators
import { AuthUser } from 'src/shared/decorators/current-user.decorator';

/** O convidado recusa: continua sem acesso (um dono pode convidar de novo). */
@Injectable()
export class RecusarConviteConversaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: ConversaParticipanteRepository,
    private readonly marcarNotificacoesLidas: MarcarNotificacoesConviteLidasService,
  ) {}

  async execute(participanteId: bigint, usuario: AuthUser) {
    validarConvitePendenteDoUsuario(await this.repository.buscarPorId(participanteId), usuario);

    const participante = await this.prisma.$transaction(async (tx) => {
      // condicional: se outra resposta/remoção chegou antes, não sobrescreve
      if (!(await this.repository.responderConvite(participanteId, 'recusado', tx))) {
        throw new ParticipanteConversaInvalidoException('Este convite já foi respondido.');
      }
      await this.marcarNotificacoesLidas.execute(participanteId, tx);
      return (await this.repository.buscarPorId(participanteId, tx)) as ParticipanteComPessoa;
    });
    return mapearParticipanteConversa(participante, usuario);
  }
}
