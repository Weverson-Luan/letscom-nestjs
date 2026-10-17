import { Injectable } from '@nestjs/common';
import { AuthUser } from 'src/shared/decorators/current-user.decorator';
import { AnotacaoClienteNaoEncontradaException } from '../exceptions/anotacao-cliente-nao-encontrada.exception';
import { SemPermissaoAnotacaoClienteException } from '../exceptions/sem-permissao-anotacao-cliente.exception';
import { ClienteAnotacaoRepository } from '../repositories/cliente-anotacao.repository';
import { ConversaAcessoService } from './conversa-acesso.service';
import { podeExcluirAnotacao } from './helpers/permissoes-anotacao.helper';

/** Exclusão lógica (autor ou admin). Os anexos ficam no storage para auditoria. */
@Injectable()
export class RemoverAnotacaoClienteService {
  constructor(
    private readonly repository: ClienteAnotacaoRepository,
    private readonly acesso: ConversaAcessoService,
  ) {}

  async execute(clienteId: bigint, id: bigint, usuario: AuthUser): Promise<void> {
    await this.acesso.garantirAcesso(clienteId, usuario);
    const anotacao = await this.repository.buscarPorId(clienteId, id);
    if (!anotacao) throw new AnotacaoClienteNaoEncontradaException();
    if (!podeExcluirAnotacao(anotacao, usuario)) {
      throw new SemPermissaoAnotacaoClienteException('excluir');
    }
    await this.repository.remover(id);
  }
}
