/**
 * IMPORTS
 */
import { Injectable } from '@nestjs/common';

// repository / mappers
import { UsuarioInternoComPapelRepository } from '../repositories/usuario-interno-com-papel.repository';
import { mapearUsuarioInterno } from '../mappers/usuario-interno.mapper';

// exceptions
import { UsuarioInternoNaoEncontradoException } from '../exceptions/usuario-interno-nao-encontrado.exception';

@Injectable()
export class BuscarUsuarioInternoService {
  constructor(private readonly repository: UsuarioInternoComPapelRepository) {}

  async execute(id: bigint) {
    const encontrado = await this.repository.buscarPorId(id);
    if (!encontrado) throw new UsuarioInternoNaoEncontradoException();

    return mapearUsuarioInterno(encontrado.usuario, encontrado.papel);
  }
}
