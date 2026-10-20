import { HttpStatus } from '@nestjs/common';
import { BusinessException } from 'src/shared/exceptions/business.exception';

/** 400: o responsável não é interno ativo, o próprio cliente nem um subordinado ativo dele. */
export class ResponsavelCompromissoInvalidoException extends BusinessException {
  constructor() {
    super(
      'Responsável inválido: informe um usuário interno ativo, o cliente ou um subordinado ativo dele.',
      HttpStatus.BAD_REQUEST,
    );
  }
}
