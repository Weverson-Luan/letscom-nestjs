/**
 * IMPORTS
 */
import { Injectable, NotFoundException } from '@nestjs/common';

// repository
import { ExcluirUsuarioRepository } from '../repositories/excluir-usuario.repository';

/** Exclui (soft delete) um usuário. */
@Injectable()
export class ExcluirUsuarioService {
  constructor(private readonly repository: ExcluirUsuarioRepository) {}

  async execute(id: bigint) {
    const user = await this.repository.buscarPorId(id);
    if (!user) throw new NotFoundException('Usuário não encontrado.');
    await this.repository.marcarComoExcluido(id);
    return true;
  }
}
