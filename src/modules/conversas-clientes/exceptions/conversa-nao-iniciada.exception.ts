import { HttpStatus } from '@nestjs/common';
import { BusinessException } from 'src/shared/exceptions/business.exception';

/** 409: só a equipe Letscom inicia a conversa; o cliente responde depois. */
export class ConversaNaoIniciadaException extends BusinessException {
  constructor() {
    super('A equipe Letscom ainda não iniciou a conversa com você.', HttpStatus.CONFLICT);
  }
}
