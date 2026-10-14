import { HttpStatus } from '@nestjs/common';
import { BusinessException } from 'src/shared/exceptions/business.exception';

/** 409: e-mail, telefone ou documento já usado por outro usuário. */
export class UsuarioInternoDuplicadoException extends BusinessException {
  constructor(message: string) {
    super(message, HttpStatus.CONFLICT);
  }
}
