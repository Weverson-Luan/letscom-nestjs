import { HttpStatus } from '@nestjs/common';
import { MENSAGEM_SEM_PERMISSAO } from 'src/shared/auth/features';
import { BusinessException } from 'src/shared/exceptions/business.exception';

/** 403: cliente/subordinado ou usuário sem a feature acessar_backoffice. */
export class AcessoBackofficeNegadoException extends BusinessException {
  constructor() {
    super(MENSAGEM_SEM_PERMISSAO, HttpStatus.FORBIDDEN);
  }
}
