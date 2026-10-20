import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthUser } from 'src/shared/decorators/current-user.decorator';
import { SemAcessoConversaException } from '../exceptions/sem-acesso-conversa.exception';
import { ConversaParticipanteRepository } from '../repositories/conversa-participante.repository';
import {
  AcessoConversa,
  montarAcessoConversa,
  montarPessoaDoUsuario,
  temAcessoConversa,
} from './helpers/participante-conversa.helper';

/**
 * Service técnico compartilhado: garante que o usuário lê/escreve na conversa do cliente
 * (regra em `temAcessoConversa`) e devolve o estado avaliado. Fora da regra: 403.
 */
@Injectable()
export class ConversaAcessoService {
  constructor(private readonly repository: ConversaParticipanteRepository) {}

  async garantirAcesso(
    clienteId: bigint,
    usuario: AuthUser,
    tx?: Prisma.TransactionClient,
  ): Promise<AcessoConversa> {
    const [participante, donos] = await Promise.all([
      this.repository.buscarDaPessoa(clienteId, montarPessoaDoUsuario(usuario), tx),
      this.repository.listarDonos(clienteId, tx),
    ]);
    const acesso = montarAcessoConversa(participante, donos, clienteId);
    if (!temAcessoConversa(acesso, clienteId, usuario)) throw new SemAcessoConversaException();
    return acesso;
  }
}
