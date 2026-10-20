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
import { MensagemConversaInvalidaException } from '../exceptions/mensagem-conversa-invalida.exception';

// mappers / conversa-mensagem
import { mapearMensagemConversa } from '../mappers/mensagem-conversa.mapper';

// helpers / conversa-mensagem
import { podeEditarMensagem } from './helpers/permissoes-mensagem.helper';

// shared / decorators
import { AuthUser } from 'src/shared/decorators/current-user.decorator';

// typings
import { AtualizarMensagemConversaDto } from '../dto/atualizar-mensagem-conversa.dto';

/** Edita texto e/ou tipo da mensagem. Só o autor; marca `editada_em`. */
@Injectable()
export class AtualizarMensagemConversaService {
  constructor(
    private readonly repository: ConversaMensagemRepository,
    private readonly acesso: ConversaAcessoService,
  ) {}

  async execute(
    clienteId: bigint,
    id: bigint,
    dados: AtualizarMensagemConversaDto,
    usuario: AuthUser,
  ) {
    await this.acesso.garantirAcesso(clienteId, usuario);
    const mensagem = await this.repository.buscarPorId(clienteId, id);
    if (!mensagem) throw new MensagemConversaNaoEncontradaException();
    if (!podeEditarMensagem(mensagem, usuario)) {
      throw new SemPermissaoMensagemConversaException('editar');
    }

    const conteudo = dados.conteudo?.trim();
    if (conteudo === '' && mensagem.anexos.length === 0) {
      throw new MensagemConversaInvalidaException('Escreva uma mensagem ou anexe um arquivo.');
    }
    if (conteudo === undefined) {
      return mapearMensagemConversa(mensagem, usuario);
    }

    const atualizada = await this.repository.atualizar(id, { conteudo, editadaEm: new Date() });
    return mapearMensagemConversa(atualizada, usuario);
  }
}
