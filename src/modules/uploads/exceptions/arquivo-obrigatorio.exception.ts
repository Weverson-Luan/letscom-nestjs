/**
 * IMPORTS
 */
import { HttpStatus } from '@nestjs/common';

// shared / exceptions
import { BusinessException } from 'src/shared/exceptions/business.exception';

/** 400: o campo multipart do arquivo não foi enviado. */
export class ArquivoObrigatorioException extends BusinessException {
  constructor(campo: string) {
    super(`O campo ${campo} é obrigatório.`, HttpStatus.BAD_REQUEST);
  }
}
