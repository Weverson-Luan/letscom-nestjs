/**
 * IMPORTS
 */
import { Injectable } from '@nestjs/common';

// repository / mappers
import { BuscarUsuarioAtendimentoRepository } from '../repositories/buscar-usuario-atendimento.repository';
import { mapearUsuarioAtendimento } from '../mappers/usuario-atendimento.mapper';

// exceptions
import { UsuarioAtendimentoNaoEncontradoException } from '../exceptions/usuario-atendimento-nao-encontrado.exception';

/** Detalha um usuário de atendimento (404 quando não existe). */
@Injectable()
export class BuscarUsuarioAtendimentoService {
  constructor(private readonly repository: BuscarUsuarioAtendimentoRepository) {}

  async execute(id: bigint) {
    const usuarioAtendimento = await this.repository.buscarPorIdComUsuario(id);
    if (!usuarioAtendimento) throw new UsuarioAtendimentoNaoEncontradoException();
    return mapearUsuarioAtendimento(usuarioAtendimento);
  }
}
