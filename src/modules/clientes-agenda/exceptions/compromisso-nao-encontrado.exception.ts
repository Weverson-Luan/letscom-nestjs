import { HttpStatus } from '@nestjs/common';
import { BusinessException } from 'src/shared/exceptions/business.exception';

/** 404: inexistente, excluído ou de outro cliente. */
export class CompromissoNaoEncontradoException extends BusinessException {
  constructor() {
    super('Compromisso não encontrado.', HttpStatus.NOT_FOUND);
  }
}
