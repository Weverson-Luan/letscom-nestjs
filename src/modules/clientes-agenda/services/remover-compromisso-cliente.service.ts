import { Injectable } from '@nestjs/common';
import { ClienteNaoEncontradoException } from '../exceptions/cliente-nao-encontrado.exception';
import { CompromissoNaoEncontradoException } from '../exceptions/compromisso-nao-encontrado.exception';
import { ClienteCompromissoRepository } from '../repositories/cliente-compromisso.repository';

/** Exclusão lógica do compromisso (preenche deleted_at). */
@Injectable()
export class RemoverCompromissoClienteService {
  constructor(private readonly repository: ClienteCompromissoRepository) {}

  async execute(clienteId: bigint, id: bigint): Promise<void> {
    if (!(await this.repository.ehClienteAtivo(clienteId))) {
      throw new ClienteNaoEncontradoException();
    }
    const compromisso = await this.repository.buscarPorId(clienteId, id);
    if (!compromisso) throw new CompromissoNaoEncontradoException();

    await this.repository.remover(id);
  }
}
