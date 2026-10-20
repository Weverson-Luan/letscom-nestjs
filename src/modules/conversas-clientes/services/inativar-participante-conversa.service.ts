import { Injectable } from '@nestjs/common';
import { AuthUser } from 'src/shared/decorators/current-user.decorator';
import { ParticipanteConversaInvalidoException } from '../exceptions/participante-conversa-invalido.exception';
import { mapearParticipanteConversa } from '../mappers/participante-conversa.mapper';
import { ConversaParticipanteRepository } from '../repositories/conversa-participante.repository';
import {
  montarPessoaDoUsuario,
  validarDonoConversa,
  validarGestaoParticipante,
} from './helpers/participante-conversa.helper';

/**
 * Um dos donos desativa o acesso de um participante: ele deixa de ler, escrever e ser notificado,
 * mas as mensagens dele ficam no histórico e o acesso pode ser reativado sem novo convite.
 */
@Injectable()
export class InativarParticipanteConversaService {
  constructor(private readonly repository: ConversaParticipanteRepository) {}

  async execute(clienteId: bigint, participanteId: bigint, usuario: AuthUser) {
    const dono = validarDonoConversa(
      await this.repository.buscarDaPessoa(clienteId, montarPessoaDoUsuario(usuario)),
    );
    const participante = validarGestaoParticipante({
      dono,
      participante: await this.repository.buscarPorId(participanteId),
      clienteId,
      acao: 'inativar',
    });
    if (participante.status !== 'aceito') {
      throw new ParticipanteConversaInvalidoException(
        'Só é possível inativar quem participa da conversa.',
      );
    }

    // update condicional: outro dono pode ter inativado ao mesmo tempo
    const alterado = await this.repository.alterarStatus(participanteId, 'aceito', {
      status: 'inativo',
      inativadoEm: new Date(),
    });
    if (!alterado) {
      throw new ParticipanteConversaInvalidoException('Este participante já foi inativado.');
    }

    const atualizado = await this.repository.buscarPorId(participanteId);
    return mapearParticipanteConversa(atualizado ?? participante, usuario);
  }
}
