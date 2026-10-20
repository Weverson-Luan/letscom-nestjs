/**
 * IMPORTS
 */

import { Injectable } from '@nestjs/common';

// services / conversa-acesso
import { ConversaAcessoService } from './conversa-acesso.service';

// repositories / conversa-mensagem
import { ConversaMensagemRepository } from '../repositories/conversa-mensagem.repository';

// exceptions / conversa-mensagem
import { MensagemConversaNaoEncontradaException } from '../exceptions/mensagem-conversa-nao-encontrada.exception';
import { SemPermissaoMensagemConversaException } from '../exceptions/sem-permissao-mensagem-conversa.exception';

// helpers / conversa-mensagem
import { podeExcluirMensagem } from './helpers/permissoes-mensagem.helper';

// shared / decorators
import { AuthUser } from 'src/shared/decorators/current-user.decorator';

/** Exclusão lógica (autor ou admin). Os anexos ficam no storage para auditoria. */
@Injectable()
export class RemoverMensagemConversaService {
  constructor(
    private readonly repository: ConversaMensagemRepository,
    private readonly acesso: ConversaAcessoService,
  ) {}

  async execute(clienteId: bigint, id: bigint, usuario: AuthUser): Promise<void> {
    await this.acesso.garantirAcesso(clienteId, usuario);

    const mensagem = await this.repository.buscarPorId(clienteId, id);

    if (!mensagem) throw new MensagemConversaNaoEncontradaException();

    if (!podeExcluirMensagem(mensagem, usuario)) {
      throw new SemPermissaoMensagemConversaException('excluir');
    }

    await this.repository.remover(id);
  }
}
