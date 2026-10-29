/**
 * IMPORTS
 */
import { Injectable } from '@nestjs/common';

// repository
import { ExcluirUsuarioAtendimentoRepository } from '../repositories/excluir-usuario-atendimento.repository';

// exceptions
import { UsuarioAtendimentoNaoEncontradoException } from '../exceptions/usuario-atendimento-nao-encontrado.exception';

/** Exclui um usuário de atendimento (404 quando não existe). */
@Injectable()
export class ExcluirUsuarioAtendimentoService {
  constructor(private readonly repository: ExcluirUsuarioAtendimentoRepository) {}

  async execute(id: bigint) {
    const existente = await this.repository.buscarPorId(id);
    if (!existente) throw new UsuarioAtendimentoNaoEncontradoException();
    await this.repository.excluir(id);
  }
}
