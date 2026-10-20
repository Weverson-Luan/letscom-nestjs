import { HttpStatus } from '@nestjs/common';
import { BusinessException } from 'src/shared/exceptions/business.exception';

/** 400: `responsavel_id` e `responsavel_subordinado_id` informados juntos. */
export class ResponsavelCompromissoDuplicadoException extends BusinessException {
  constructor() {
    super(
      'Informe só um responsável: responsavel_id ou responsavel_subordinado_id.',
      HttpStatus.BAD_REQUEST,
    );
  }
}
