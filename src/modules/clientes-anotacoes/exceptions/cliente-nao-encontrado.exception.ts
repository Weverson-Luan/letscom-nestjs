import { HttpStatus } from '@nestjs/common';
import { BusinessException } from 'src/shared/exceptions/business.exception';

/** 404: inexistente, excluído ou sem papel de cliente ativo. */
export class ClienteNaoEncontradoException extends BusinessException {
  constructor() {
    super('Cliente não encontrado.', HttpStatus.NOT_FOUND);
  }
}
