import { Injectable } from '@nestjs/common';
import { AuthUser } from 'src/shared/decorators/current-user.decorator';
import { ArquivoAnexo } from '../clientes-anotacoes.constants';
import { ResponderAnotacoesClienteDto } from '../dto/responder-anotacoes-cliente.dto';
import { ClienteNaoEncontradoException } from '../exceptions/cliente-nao-encontrado.exception';
import { mapearAnotacaoCliente } from '../mappers/anotacao-cliente.mapper';
import { ClienteAnotacaoRepository } from '../repositories/cliente-anotacao.repository';
import { ConversaNaoIniciadaException } from '../exceptions/conversa-nao-iniciada.exception';
import { AnotacaoRegistroService } from './anotacao-registro.service';
import { ConversaAcessoService } from './conversa-acesso.service';
import {
  extrairClienteIdDoUsuario,
  montarAutorCliente,
} from './helpers/resolver-usuario-anotacao.helper';
import {
  normalizarNomesAnexos,
  validarNovaAnotacao,
} from './helpers/validar-anexos-anotacao.helper';

/** Participante do lado do cliente escreve na conversa já iniciada pela equipe (notifica os demais). */
@Injectable()
export class ResponderAnotacoesClienteService {
  constructor(
    private readonly repository: ClienteAnotacaoRepository,
    private readonly acesso: ConversaAcessoService,
    private readonly registro: AnotacaoRegistroService,
  ) {}

  async execute(dados: ResponderAnotacoesClienteDto, arquivos: ArquivoAnexo[], usuario: AuthUser) {
    const anexos = normalizarNomesAnexos(arquivos);
    // validação antecipada (o registro valida de novo): evita consultar o banco à toa
    validarNovaAnotacao(dados.conteudo, anexos);

    const clienteId = extrairClienteIdDoUsuario(usuario);
    if (!clienteId || !(await this.repository.ehClienteAtivo(clienteId))) {
      throw new ClienteNaoEncontradoException();
    }
    const acesso = await this.acesso.garantirAcesso(clienteId, usuario);
    if (!acesso.iniciada) throw new ConversaNaoIniciadaException();

    const anotacao = await this.registro.registrar({
      clienteId,
      autor: montarAutorCliente(usuario),
      tipo: 'nota',
      conteudo: dados.conteudo,
      arquivos: anexos,
    });
    return mapearAnotacaoCliente(anotacao, usuario);
  }
}
