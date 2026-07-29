import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Equivalente ao App\Exceptions\BusinessException do Laravel.
 * Representa um erro de regra de negócio previsto (mensagem exibível ao cliente).
 * Por padrão retorna 400 (Bad Request), mas o código pode ser customizado.
 */
export class BusinessException extends HttpException {
  constructor(message: string, statusCode: HttpStatus = HttpStatus.BAD_REQUEST) {
    super(message, statusCode);
  }
}
