import { HttpStatus } from '@nestjs/common';
import { BusinessException } from 'src/shared/exceptions/business.exception';

/** 403: só os dois donos da conversa convidam e removem participantes. */
export class SemPermissaoConviteConversaException extends BusinessException {
  constructor(mensagem = 'Só quem iniciou a conversa pode convidar ou remover participantes.') {
    super(mensagem, HttpStatus.FORBIDDEN);
  }
}
