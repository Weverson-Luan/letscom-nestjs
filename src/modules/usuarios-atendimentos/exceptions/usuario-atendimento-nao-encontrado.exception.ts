/**
 * IMPORTS
 */
import { HttpStatus } from '@nestjs/common';

// shared / exceptions
import { BusinessException } from 'src/shared/exceptions/business.exception';

/** 404: usuário de atendimento inexistente. */
export class UsuarioAtendimentoNaoEncontradoException extends BusinessException {
  constructor() {
    super('Atendimento não encontrado.', HttpStatus.NOT_FOUND);
  }
}
