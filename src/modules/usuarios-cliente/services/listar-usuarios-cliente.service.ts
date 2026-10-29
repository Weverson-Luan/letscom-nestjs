/**
 * IMPORTS
 */
import { Injectable } from '@nestjs/common';

// repository
import { ListarUsuariosClienteRepository } from '../repositories/listar-usuarios-cliente.repository';

/** Lista todos os usuários subordinados (de todos os clientes). */
@Injectable()
export class ListarUsuariosClienteService {
  constructor(private readonly repository: ListarUsuariosClienteRepository) {}

  execute() {
    return this.repository.listarTodos();
  }
}
