import { Injectable } from '@nestjs/common';
import { ClienteNaoEncontradoException } from '../exceptions/cliente-nao-encontrado.exception';
import { mapearResumoClienteAnotacoes } from '../mappers/resumo-cliente-anotacoes.mapper';
import { ClienteResumoAnotacoesRepository } from '../repositories/cliente-resumo-anotacoes.repository';

/** Cabeçalho da tela de anotações de um cliente. */
@Injectable()
export class BuscarClienteAnotacoesService {
  constructor(private readonly repository: ClienteResumoAnotacoesRepository) {}

  async execute(clienteId: bigint) {
    const linha = await this.repository.buscarPorId(clienteId);
    if (!linha) throw new ClienteNaoEncontradoException();
    return mapearResumoClienteAnotacoes(linha);
  }
}
