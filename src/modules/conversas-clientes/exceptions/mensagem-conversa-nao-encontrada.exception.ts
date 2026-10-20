import { HttpStatus } from '@nestjs/common';
import { BusinessException } from 'src/shared/exceptions/business.exception';

/** 404: inexistente, excluída ou de outro cliente. */
export class MensagemConversaNaoEncontradaException extends BusinessException {
  constructor() {
    super('Mensagem não encontrada.', HttpStatus.NOT_FOUND);
  }
}
