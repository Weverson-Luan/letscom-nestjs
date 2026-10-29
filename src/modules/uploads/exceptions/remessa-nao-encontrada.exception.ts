/**
 * IMPORTS
 */
import { HttpStatus } from '@nestjs/common';

// shared / exceptions
import { BusinessException } from 'src/shared/exceptions/business.exception';

/** 404: remessa inexistente. */
export class RemessaNaoEncontradaException extends BusinessException {
  constructor() {
    super('Remessa não encontrada.', HttpStatus.NOT_FOUND);
  }
}
