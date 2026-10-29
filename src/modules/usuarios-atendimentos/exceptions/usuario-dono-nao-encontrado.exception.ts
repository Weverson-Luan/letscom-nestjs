/**
 * IMPORTS
 */
import { HttpStatus } from '@nestjs/common';

// shared / exceptions
import { BusinessException } from 'src/shared/exceptions/business.exception';

/** 404: usuário dono (`user_id`) inexistente ou excluído (soft delete). */
export class UsuarioDonoNaoEncontradoException extends BusinessException {
  constructor() {
    super('Usuário não encontrado.', HttpStatus.NOT_FOUND);
  }
}
