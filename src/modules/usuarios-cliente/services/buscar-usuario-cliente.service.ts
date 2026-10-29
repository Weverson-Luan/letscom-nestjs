/**
 * IMPORTS
 */
import { Injectable } from '@nestjs/common';

// repository
import { BuscarUsuarioClienteRepository } from '../repositories/buscar-usuario-cliente.repository';

/** Busca um usuário subordinado por id (null quando não existe, como no Laravel). */
@Injectable()
export class BuscarUsuarioClienteService {
  constructor(private readonly repository: BuscarUsuarioClienteRepository) {}

  execute(id: bigint) {
    return this.repository.buscarPorId(id);
  }
}
