import { Injectable } from '@nestjs/common';
import { UsuarioInternoNaoEncontradoException } from '../exceptions/usuario-interno-nao-encontrado.exception';
import { mapearUsuarioInterno } from '../mappers/usuario-interno.mapper';
import { UsuarioInternoRepository } from '../repositories/usuario-interno.repository';

@Injectable()
export class BuscarUsuarioInternoService {
  constructor(private readonly repository: UsuarioInternoRepository) {}

  async execute(id: bigint) {
    const encontrado = await this.repository.buscarPorId(id);
    if (!encontrado) throw new UsuarioInternoNaoEncontradoException();

    return mapearUsuarioInterno(encontrado.usuario, encontrado.papel);
  }
}
