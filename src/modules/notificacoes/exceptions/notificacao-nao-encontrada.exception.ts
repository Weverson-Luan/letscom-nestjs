import { HttpStatus } from '@nestjs/common';
import { BusinessException } from 'src/shared/exceptions/business.exception';

/** 404: inexistente ou de outro destinatário. */
export class NotificacaoNaoEncontradaException extends BusinessException {
  constructor() {
    super('Notificação não encontrada.', HttpStatus.NOT_FOUND);
  }
}
