import { HttpStatus } from '@nestjs/common';
import { BusinessException } from 'src/shared/exceptions/business.exception';

/** 404: anexo inexistente, de outro compromisso/cliente, de compromisso excluído ou ausente no storage. */
export class AnexoCompromissoNaoEncontradoException extends BusinessException {
  constructor() {
    super('Anexo não encontrado.', HttpStatus.NOT_FOUND);
  }
}
