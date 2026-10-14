import { HttpStatus } from '@nestjs/common';
import { BusinessException } from 'src/shared/exceptions/business.exception';

/** 409: e-mail, documento ou telefone já usado por outro cadastro (índice único do banco). */
export class CadastroDuplicadoException extends BusinessException {
  constructor(message: string) {
    super(message, HttpStatus.CONFLICT);
  }
}
