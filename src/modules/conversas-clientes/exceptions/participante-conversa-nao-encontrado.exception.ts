import { HttpStatus } from '@nestjs/common';
import { BusinessException } from 'src/shared/exceptions/business.exception';

/** 404: participante/convite inexistente, de outra conversa ou de outra pessoa. */
export class ParticipanteConversaNaoEncontradoException extends BusinessException {
  constructor(mensagem = 'Participante não encontrado.') {
    super(mensagem, HttpStatus.NOT_FOUND);
  }
}
