import { Injectable } from '@nestjs/common';
import { AuthUser } from 'src/shared/decorators/current-user.decorator';
import { ArquivoAnexo } from '../clientes-anotacoes.constants';
import { CriarAnotacaoClienteDto } from '../dto/criar-anotacao-cliente.dto';
import { ClienteNaoEncontradoException } from '../exceptions/cliente-nao-encontrado.exception';
import { mapearAnotacaoCliente } from '../mappers/anotacao-cliente.mapper';
import { ClienteAnotacaoRepository } from '../repositories/cliente-anotacao.repository';
import { AnotacaoRegistroService } from './anotacao-registro.service';
import { montarAutorInterno } from './helpers/resolver-usuario-anotacao.helper';
import { validarNovaAnotacao } from './helpers/validar-anexos-anotacao.helper';

/** Equipe interna registra uma anotação na conversa do cliente (notifica o cliente). */
@Injectable()
export class CriarAnotacaoClienteService {
  constructor(
    private readonly repository: ClienteAnotacaoRepository,
    private readonly registro: AnotacaoRegistroService,
  ) {}

  async execute(
    clienteId: bigint,
    dados: CriarAnotacaoClienteDto,
    arquivos: ArquivoAnexo[],
    usuario: AuthUser,
  ) {
    // validação antecipada (o registro valida de novo): evita consultar o banco à toa
    validarNovaAnotacao(dados.conteudo, arquivos);

    if (!(await this.repository.ehClienteAtivo(clienteId))) {
      throw new ClienteNaoEncontradoException();
    }

    const anotacao = await this.registro.registrar({
      clienteId,
      autor: montarAutorInterno(usuario),
      tipo: dados.tipo ?? 'nota',
      conteudo: dados.conteudo,
      arquivos,
    });
    return mapearAnotacaoCliente(anotacao, usuario);
  }
}
