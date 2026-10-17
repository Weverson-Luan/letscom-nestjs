import { Injectable } from '@nestjs/common';
import { AuthUser } from 'src/shared/decorators/current-user.decorator';
import { ArquivoAnexo } from '../clientes-anotacoes.constants';
import { ResponderAnotacoesClienteDto } from '../dto/responder-anotacoes-cliente.dto';
import { ClienteNaoEncontradoException } from '../exceptions/cliente-nao-encontrado.exception';
import { mapearAnotacaoCliente } from '../mappers/anotacao-cliente.mapper';
import { ClienteAnotacaoRepository } from '../repositories/cliente-anotacao.repository';
import { AnotacaoRegistroService } from './anotacao-registro.service';
import {
  extrairClienteIdDoUsuario,
  montarAutorCliente,
} from './helpers/resolver-usuario-anotacao.helper';
import { validarNovaAnotacao } from './helpers/validar-anexos-anotacao.helper';

/** Cliente/subordinado escreve na conversa da empresa (notifica consultores e participantes). */
@Injectable()
export class ResponderAnotacoesClienteService {
  constructor(
    private readonly repository: ClienteAnotacaoRepository,
    private readonly registro: AnotacaoRegistroService,
  ) {}

  async execute(dados: ResponderAnotacoesClienteDto, arquivos: ArquivoAnexo[], usuario: AuthUser) {
    // validação antecipada (o registro valida de novo): evita consultar o banco à toa
    validarNovaAnotacao(dados.conteudo, arquivos);

    const clienteId = extrairClienteIdDoUsuario(usuario);
    if (!clienteId || !(await this.repository.ehClienteAtivo(clienteId))) {
      throw new ClienteNaoEncontradoException();
    }

    const anotacao = await this.registro.registrar({
      clienteId,
      autor: montarAutorCliente(usuario),
      tipo: 'nota',
      conteudo: dados.conteudo,
      arquivos,
    });
    return mapearAnotacaoCliente(anotacao, usuario);
  }
}
