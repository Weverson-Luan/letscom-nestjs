/**
 * IMPORTS
 */
import { Injectable, NotFoundException } from '@nestjs/common';

// repository / mappers
import { BuscarUsuarioRepository } from '../repositories/buscar-usuario.repository';
import { UsersResponseMapper } from '../mappers/users-response.mapper';

/** Busca um usuário por id com o tipo de entrega vinculado. */
@Injectable()
export class BuscarUsuarioService {
  constructor(
    private readonly repository: BuscarUsuarioRepository,
    private readonly mapper: UsersResponseMapper,
  ) {}

  async execute(id: bigint) {
    const user = await this.repository.buscarPorIdComTipoEntrega(id);
    if (!user) throw new NotFoundException('Usuário não encontrado.');
    return this.mapper.mapSingleUser(user);
  }
}
