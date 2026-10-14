import { HttpStatus } from '@nestjs/common';
import { BusinessException } from 'src/shared/exceptions/business.exception';

/** 404: inexistente, excluído ou não é usuário interno (consultor/producao/recepcao). */
export class UsuarioInternoNaoEncontradoException extends BusinessException {
  constructor() {
    super('Usuário interno não encontrado.', HttpStatus.NOT_FOUND);
  }
}
