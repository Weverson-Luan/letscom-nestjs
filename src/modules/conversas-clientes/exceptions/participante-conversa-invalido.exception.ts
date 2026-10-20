import { HttpStatus } from '@nestjs/common';
import { BusinessException } from 'src/shared/exceptions/business.exception';

/** 400: convite/remoção que fere a regra (pessoa inexistente, já participa, dono etc.). */
export class ParticipanteConversaInvalidoException extends BusinessException {
  constructor(mensagem: string) {
    super(mensagem, HttpStatus.BAD_REQUEST);
  }
}
