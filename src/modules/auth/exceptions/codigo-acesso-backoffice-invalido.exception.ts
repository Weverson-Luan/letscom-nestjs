import { HttpStatus } from '@nestjs/common';
import { BusinessException } from 'src/shared/exceptions/business.exception';

/** 401: código de acesso ao backoffice inexistente, expirado ou já usado. */
export class CodigoAcessoBackofficeInvalidoException extends BusinessException {
  constructor() {
    super('Código de acesso inválido ou expirado.', HttpStatus.UNAUTHORIZED);
  }
}
