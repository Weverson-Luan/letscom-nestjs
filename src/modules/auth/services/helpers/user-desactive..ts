/**
 * IMPORTS
 */

// mappers
import { HttpException, HttpStatus } from '@nestjs/common';



  function userDesactiveMappers(message?: string) {
    return new HttpException(
      {
        code: 422,
        message: 'Usuário desativado',
        errors: {
          ativo: message ?? 'Este usuário está desativado e não pode acessar o sistema!',
        },
      },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }


  /**
   * EXPORTS
   */
  export { userDesactiveMappers };