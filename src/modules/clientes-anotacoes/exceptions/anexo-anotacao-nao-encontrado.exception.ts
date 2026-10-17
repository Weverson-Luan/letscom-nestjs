import { HttpStatus } from '@nestjs/common';
import { BusinessException } from 'src/shared/exceptions/business.exception';

/** 404: anexo inexistente, de outra anotação/cliente ou ausente no storage. */
export class AnexoAnotacaoNaoEncontradoException extends BusinessException {
  constructor() {
    super('Anexo não encontrado.', HttpStatus.NOT_FOUND);
  }
}
