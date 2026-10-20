import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthUser } from 'src/shared/decorators/current-user.decorator';
import { ParticipanteConversaInvalidoException } from '../exceptions/participante-conversa-invalido.exception';
import { ParticipanteConversaNaoEncontradoException } from '../exceptions/participante-conversa-nao-encontrado.exception';
import { SemPermissaoConviteConversaException } from '../exceptions/sem-permissao-convite-conversa.exception';
import { ConversaParticipanteRepository } from '../repositories/conversa-participante.repository';
import {
  ladoDoParticipante,
  montarPessoaDoUsuario,
  validarDonoConversa,
} from './helpers/participante-conversa.helper';

/**
 * Um dos donos tira um convidado (ou cancela o convite pendente). Os donos não saem; o dono do
 * lado do cliente só remove pessoas da própria empresa.
 */
@Injectable()
export class RemoverParticipanteConversaService {
  constructor(private readonly repository: ConversaParticipanteRepository) {}

  async execute(clienteId: bigint, participanteId: bigint, usuario: AuthUser): Promise<void> {
    const dono = validarDonoConversa(
      await this.repository.buscarDaPessoa(clienteId, montarPessoaDoUsuario(usuario)),
    );

    const participante = await this.repository.buscarPorId(participanteId);
    // de outra conversa é 404: não revela que o id existe
    if (!participante || participante.clienteId !== clienteId) {
      throw new ParticipanteConversaNaoEncontradoException();
    }
    if (participante.papel === 'dono') {
      throw new ParticipanteConversaInvalidoException(
        'Não é possível remover quem iniciou a conversa.',
      );
    }
    if (
      ladoDoParticipante(dono, clienteId) === 'cliente' &&
      ladoDoParticipante(participante, clienteId) === 'interno'
    ) {
      throw new SemPermissaoConviteConversaException(
        'Você só pode remover pessoas da sua empresa.',
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
