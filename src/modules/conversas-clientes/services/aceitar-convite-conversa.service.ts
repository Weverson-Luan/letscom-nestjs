import { Injectable } from '@nestjs/common';
import { MarcarNotificacoesConviteLidasService } from 'src/modules/notificacoes/services/marcar-notificacoes-convite-lidas.service';
import { AuthUser } from 'src/shared/decorators/current-user.decorator';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { ParticipanteConversaInvalidoException } from '../exceptions/participante-conversa-invalido.exception';
import { mapearParticipanteConversa } from '../mappers/participante-conversa.mapper';
import {
  ConversaParticipanteRepository,
  ParticipanteComPessoa,
} from '../repositories/conversa-participante.repository';
import { validarConvitePendenteDoUsuario } from './helpers/participante-conversa.helper';

/** O convidado aceita: passa a ler e escrever na conversa e a ser notificado. */
@Injectable()
export class AceitarConviteConversaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: ConversaParticipanteRepository,
    private readonly marcarNotificacoesLidas: MarcarNotificacoesConviteLidasService,
  ) {}

  async execute(participanteId: bigint, usuario: AuthUser) {
    validarConvitePendenteDoUsuario(await this.repository.buscarPorId(participanteId), usuario);

    const participante = await this.prisma.$transaction(async (tx) => {
      // condicional: se outra resposta/remoção chegou antes, não sobrescreve
      if (!(await this.repository.responderConvite(participanteId, 'aceito', tx))) {
        throw new ParticipanteConversaInvalidoException('Este convite já foi respondido.');
      }
      await this.marcarNotificacoesLidas.execute(participanteId, tx);
      return (await this.repository.buscarPorId(participanteId, tx)) as ParticipanteComPessoa;
    });
    return mapearParticipanteConversa(participante, usuario);
  }
}
