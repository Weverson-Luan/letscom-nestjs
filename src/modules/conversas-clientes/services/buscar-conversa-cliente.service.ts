import { Injectable } from '@nestjs/common';
import { ClienteNaoEncontradoException } from '../exceptions/cliente-nao-encontrado.exception';
import { mapearResumoConversaCliente } from '../mappers/resumo-conversa-cliente.mapper';
import { ConversaClienteResumoRepository } from '../repositories/conversa-cliente-resumo.repository';

/** Cabeçalho da tela de mensagens de um cliente. */
@Injectable()
export class BuscarConversaClienteService {
  constructor(private readonly repository: ConversaClienteResumoRepository) {}

  async execute(clienteId: bigint) {
    const linha = await this.repository.buscarPorId(clienteId);
    if (!linha) throw new ClienteNaoEncontradoException();
    return mapearResumoConversaCliente(linha);
  }
}
