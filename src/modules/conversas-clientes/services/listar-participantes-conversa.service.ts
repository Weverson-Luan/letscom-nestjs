import { Injectable } from '@nestjs/common';
import { AuthUser } from 'src/shared/decorators/current-user.decorator';
import { ClienteNaoEncontradoException } from '../exceptions/cliente-nao-encontrado.exception';
import { mapearEstadoConversa } from '../mappers/participante-conversa.mapper';
import { ConversaMensagemRepository } from '../repositories/conversa-mensagem.repository';
import { ConversaParticipanteRepository } from '../repositories/conversa-participante.repository';
import {
  montarAcessoConversa,
  montarPessoaDoUsuario,
  temAcessoConversa,
} from './helpers/participante-conversa.helper';

/**
 * Estado da conversa para o usuário logado: se foi iniciada, a participação dele (inclusive
 * convite pendente) e, só para quem tem acesso, a lista de participantes.
 */
@Injectable()
export class ListarParticipantesConversaService {
  constructor(
    private readonly repository: ConversaParticipanteRepository,
    private readonly mensagemRepository: ConversaMensagemRepository,
  ) {}

  async execute(clienteId: bigint, usuario: AuthUser) {
    if (!(await this.mensagemRepository.ehClienteAtivo(clienteId))) {
      throw new ClienteNaoEncontradoException();
    }

    const [participante, donos] = await Promise.all([
      this.repository.buscarDaPessoa(clienteId, montarPessoaDoUsuario(usuario)),
      this.repository.listarDonos(clienteId),
    ]);
    const acesso = montarAcessoConversa(participante, donos, clienteId);
    const temAcesso = temAcessoConversa(acesso, clienteId, usuario);
    const participantes = temAcesso ? await this.repository.listar(clienteId) : [];

    return mapearEstadoConversa({ acesso, temAcesso, participantes, usuario });
  }
}
