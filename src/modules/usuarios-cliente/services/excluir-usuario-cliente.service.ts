/**
 * IMPORTS
 */
import { HttpStatus, Injectable } from '@nestjs/common';

// shared
import { BusinessException } from 'src/shared/exceptions/business.exception';

// repository
import { ExcluirUsuarioClienteRepository } from '../repositories/excluir-usuario-cliente.repository';

/** Exclui um usuário subordinado que não tenha remessas vinculadas. */
@Injectable()
export class ExcluirUsuarioClienteService {
  constructor(private readonly repository: ExcluirUsuarioClienteRepository) {}

  async execute(id: bigint) {
    const usuario = await this.repository.buscarPorId(id);
    if (!usuario) {
      throw new BusinessException('Usuário não encontrado.', HttpStatus.UNPROCESSABLE_ENTITY);
    }

    const remessasVinculadas = await this.repository.contarRemessasDoSubordinado(id);
    if (remessasVinculadas > 0) {
      throw new BusinessException(
        'Não é possível excluir este usuário porque ele possui remessas vinculadas no sistema. Utilize a opção de inativar o usuário para bloquear o acesso sem perder o histórico.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    await this.repository.excluir(id);
  }
}
