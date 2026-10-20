/**
 * IMPORTS
 */

import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

// repositories
import { ConversaParticipanteRepository } from '../repositories/conversa-participante.repository';

// exceptions
import { ParticipanteConversaInvalidoException } from '../exceptions/participante-conversa-invalido.exception';
import { ParticipanteConversaNaoEncontradoException } from '../exceptions/participante-conversa-nao-encontrado.exception';

// helpers / conversa
import {
  montarPessoaDoUsuario,
  validarDonoConversa,
  validarGestaoParticipante,
} from './helpers/participante-conversa.helper';

// shared / decorators
import { AuthUser } from 'src/shared/decorators/current-user.decorator';

/**
 * Um dos donos cancela um convite (pendente ou recusado). Quem já participa não é removido:
 * tem o acesso inativado, para poder voltar depois (InativarParticipanteConversaService).
 */
@Injectable()
export class RemoverParticipanteConversaService {
  constructor(private readonly repository: ConversaParticipanteRepository) {}

  async execute(clienteId: bigint, participanteId: bigint, usuario: AuthUser): Promise<void> {
    const dono = validarDonoConversa(
      await this.repository.buscarDaPessoa(clienteId, montarPessoaDoUsuario(usuario)),
    );

    const participante = validarGestaoParticipante({
      dono,
      participante: await this.repository.buscarPorId(participanteId),
      clienteId,
      acao: 'remover',
    });

    if (participante.status === 'aceito' || participante.status === 'inativo') {
      throw new ParticipanteConversaInvalidoException(
        'Quem já participa da conversa não é removido: inative o acesso.',
      );
    }

    try {
      await this.repository.remover(participanteId);
    } catch (erro) {
      // removido ao mesmo tempo por outro dono
      if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2025') {
        throw new ParticipanteConversaNaoEncontradoException();
      }
      throw erro;
    }
  }
}
