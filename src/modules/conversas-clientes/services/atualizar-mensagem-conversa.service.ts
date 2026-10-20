import { Injectable } from '@nestjs/common';
import { AuthUser } from 'src/shared/decorators/current-user.decorator';
import { AtualizarAnotacaoClienteDto } from '../dto/atualizar-anotacao-cliente.dto';
import { AnotacaoClienteInvalidaException } from '../exceptions/anotacao-cliente-invalida.exception';
import { AnotacaoClienteNaoEncontradaException } from '../exceptions/anotacao-cliente-nao-encontrada.exception';
import { SemPermissaoAnotacaoClienteException } from '../exceptions/sem-permissao-anotacao-cliente.exception';
import { mapearAnotacaoCliente } from '../mappers/anotacao-cliente.mapper';
import { ClienteAnotacaoRepository } from '../repositories/cliente-anotacao.repository';
import { ConversaAcessoService } from './conversa-acesso.service';
import { podeEditarAnotacao } from './helpers/permissoes-anotacao.helper';

/** Edita texto e/ou tipo da anotação. Só o autor; marca `editada_em`. */
@Injectable()
export class AtualizarAnotacaoClienteService {
  constructor(
    private readonly repository: ClienteAnotacaoRepository,
    private readonly acesso: ConversaAcessoService,
  ) {}

  async execute(
    clienteId: bigint,
    id: bigint,
    dados: AtualizarAnotacaoClienteDto,
    usuario: AuthUser,
  ) {
    await this.acesso.garantirAcesso(clienteId, usuario);
    const anotacao = await this.repository.buscarPorId(clienteId, id);
    if (!anotacao) throw new AnotacaoClienteNaoEncontradaException();
    if (!podeEditarAnotacao(anotacao, usuario)) {
      throw new SemPermissaoAnotacaoClienteException('editar');
    }

    const conteudo = dados.conteudo?.trim();
    if (conteudo === '' && anotacao.anexos.length === 0) {
      throw new AnotacaoClienteInvalidaException('Escreva uma anotação ou anexe um arquivo.');
    }
    if (conteudo === undefined && dados.tipo === undefined) {
      return mapearAnotacaoCliente(anotacao, usuario);
    }

    const atualizada = await this.repository.atualizar(id, {
      ...(conteudo !== undefined ? { conteudo } : {}),
      ...(dados.tipo !== undefined ? { tipo: dados.tipo } : {}),
      editadaEm: new Date(),
    });
    return mapearAnotacaoCliente(atualizada, usuario);
  }
}
