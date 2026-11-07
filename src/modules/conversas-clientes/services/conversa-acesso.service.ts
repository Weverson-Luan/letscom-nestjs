import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthUser } from 'src/shared/decorators/current-user.decorator';
import { SemAcessoConversaException } from '../exceptions/sem-acesso-conversa.exception';
import { ConversaMensagemRepository } from '../repositories/conversa-mensagem.repository';
import { ConversaParticipanteRepository } from '../repositories/conversa-participante.repository';
import {
  AcessoConversa,
  montarAcessoConversa,
  montarPessoaDoUsuario,
  precisaPrimeiraMensagemDoUsuario,
  temAcessoConversa,
} from './helpers/participante-conversa.helper';

/**
 * Service técnico compartilhado: garante que o usuário lê/escreve na conversa do cliente
 * (regra em `temAcessoConversa`) e devolve o estado avaliado, com a data da primeira mensagem do
 * usuário quando o corte de visibilidade precisa dela. Fora da regra: 403.
 */
@Injectable()
export class ConversaAcessoService {
  constructor(
    private readonly repository: ConversaParticipanteRepository,
    private readonly mensagemRepository: ConversaMensagemRepository,
  ) {}

  async garantirAcesso(
    clienteId: bigint,
    usuario: AuthUser,
    tx?: Prisma.TransactionClient,
  ): Promise<AcessoConversa> {
    const [participante, donos, primeiraMensagemDoUsuarioEm] = await Promise.all([
      this.repository.buscarDaPessoa(clienteId, montarPessoaDoUsuario(usuario), tx),
      this.repository.listarDonos(clienteId, tx),
      precisaPrimeiraMensagemDoUsuario(usuario)
        ? this.mensagemRepository.buscarDataPrimeiraMensagemDoAutor(clienteId, usuario.id, tx)
        : undefined,
    ]);
    const acesso = montarAcessoConversa(
      participante,
      donos,
      clienteId,
      primeiraMensagemDoUsuarioEm,
    );
    if (!temAcessoConversa(acesso, clienteId, usuario)) throw new SemAcessoConversaException();
    return acesso;
  }
}
