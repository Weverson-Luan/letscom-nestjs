/**
 * IMPORTS
 */
import { Injectable } from '@nestjs/common';

// repository / mappers
import { ListarUsuariosAtendimentoRepository } from '../repositories/listar-usuarios-atendimento.repository';
import { mapearUsuarioAtendimento } from '../mappers/usuario-atendimento.mapper';

/** Lista todos os usuários de atendimento com o usuário dono. */
@Injectable()
export class ListarUsuariosAtendimentoService {
  constructor(private readonly repository: ListarUsuariosAtendimentoRepository) {}

  async execute() {
    const usuariosAtendimento = await this.repository.listarComUsuario();
    return usuariosAtendimento.map(mapearUsuarioAtendimento);
  }
}
