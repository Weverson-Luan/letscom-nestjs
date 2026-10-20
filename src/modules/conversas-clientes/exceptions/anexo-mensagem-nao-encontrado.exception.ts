import { HttpStatus } from '@nestjs/common';
import { BusinessException } from 'src/shared/exceptions/business.exception';

/** 404: anexo inexistente, de outra mensagem/cliente ou ausente no storage. */
export class AnexoMensagemNaoEncontradoException extends BusinessException {
  constructor() {
    super('Anexo não encontrado.', HttpStatus.NOT_FOUND);
  }
}
