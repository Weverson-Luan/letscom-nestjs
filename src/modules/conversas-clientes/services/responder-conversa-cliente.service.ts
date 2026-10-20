/**
 * IMPORTS
 */

import { Injectable } from '@nestjs/common';

// repositories
import { ConversaMensagemRepository } from '../repositories/conversa-mensagem.repository';
import { ConversaNaoIniciadaException } from '../exceptions/conversa-nao-iniciada.exception';

// services
import { MensagemRegistroService } from './mensagem-registro.service';
import { ConversaAcessoService } from './conversa-acesso.service';

// mappers / conversa
import { mapearMensagemConversa } from '../mappers/mensagem-conversa.mapper';

// helpers
import {
  extrairClienteIdDoUsuario,
  montarAutorCliente,
} from './helpers/resolver-usuario-conversa.helper';
import {
  normalizarNomesAnexos,
  validarNovaMensagem,
} from './helpers/validar-anexos-mensagem.helper';

import { AuthUser } from 'src/shared/decorators/current-user.decorator';
import { ArquivoAnexo } from '../conversas-clientes.constants';

// typings
import { ResponderConversaClienteDto } from '../dto/responder-conversa-cliente.dto';
import { ClienteNaoEncontradoException } from '../exceptions/cliente-nao-encontrado.exception';

/** Participante do lado do cliente escreve na conversa já iniciada pela equipe (notifica os demais). */
@Injectable()
export class ResponderConversaClienteService {
  constructor(
    private readonly repository: ConversaMensagemRepository,
    private readonly acesso: ConversaAcessoService,
    private readonly registro: MensagemRegistroService,
  ) {}

  async execute(dados: ResponderConversaClienteDto, arquivos: ArquivoAnexo[], usuario: AuthUser) {
    const anexos = normalizarNomesAnexos(arquivos);
    // validação antecipada (o registro valida de novo): evita consultar o banco à toa
    validarNovaMensagem(dados.conteudo, anexos);

    const clienteId = extrairClienteIdDoUsuario(usuario);
    if (!clienteId || !(await this.repository.ehClienteAtivo(clienteId))) {
      throw new ClienteNaoEncontradoException();
    }
    const acesso = await this.acesso.garantirAcesso(clienteId, usuario);
    if (!acesso.iniciada) throw new ConversaNaoIniciadaException();

    const mensagem = await this.registro.registrar({
      clienteId,
      autor: montarAutorCliente(usuario),
      conteudo: dados.conteudo,
      arquivos: anexos,
    });
    return mapearMensagemConversa(mensagem, usuario);
  }
}
