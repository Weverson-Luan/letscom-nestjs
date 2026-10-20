import { HttpStatus } from '@nestjs/common';
import { BusinessException } from 'src/shared/exceptions/business.exception';

/** 403: a conversa já foi iniciada e o usuário não é dono nem convidado (com convite aceito). */
export class SemAcessoConversaException extends BusinessException {
  constructor() {
    super(
      'Você não participa desta conversa. Peça um convite a quem iniciou a conversa.',
      HttpStatus.FORBIDDEN,
    );
  }
}
