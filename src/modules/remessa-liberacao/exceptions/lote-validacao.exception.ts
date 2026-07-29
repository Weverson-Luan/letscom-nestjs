import { HttpException, HttpStatus } from '@nestjs/common';

export type RemessaLoteItem = {
  id: bigint | number;
  numero_remessa: string | number | bigint;
  motivo?: string;
};

/**
 * Espelha o BusinessException com JSON `{ tipo: 'validacao', ... }` do Laravel
 * (LiberarRemessasLoteBalcao/ClienteService). O AllExceptionsFilter repassa
 * o corpo verbatim por conter `code`.
 */
export class LoteValidacaoException extends HttpException {
  constructor(invalidas: RemessaLoteItem[], validas: RemessaLoteItem[]) {
    super(
      {
        code: 422,
        message: 'Existem remessas inválidas na seleção.',
        data: {
          tipo: 'validacao',
          invalidas,
          validas,
        },
      },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}
