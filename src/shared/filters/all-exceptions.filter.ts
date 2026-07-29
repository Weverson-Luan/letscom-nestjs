import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiResponse } from '../utils/api-response';

/**
 * Filtro global de exceções. Padroniza toda saída de erro no formato
 * { code, status: 'error', message, data: [], pagination: null }, espelhando
 * os *ResponseHelper::jsonError do Laravel. Trata também os erros de validação
 * do class-validator (BadRequestException com array de mensagens).
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Erro interno do servidor';
    let errors: unknown;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const res = exception.getResponse();

      // Corpo já formatado no estilo Laravel (contém `code`): repassa verbatim,
      // preservando o contrato exato ({ code, message, errors } / { code, status, error }).
      if (
        typeof res === 'object' &&
        res !== null &&
        'code' in (res as Record<string, unknown>)
      ) {
        response.status(statusCode).json(res);
        return;
      }

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const body = res as Record<string, unknown>;
        const rawMessage = body.message;

        if (Array.isArray(rawMessage)) {
          // Erros de validação do class-validator
          message = 'Dados inválidos.';
          errors = rawMessage;
        } else if (typeof rawMessage === 'string') {
          message = rawMessage;
        } else if (typeof body.error === 'string') {
          message = body.error;
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    if (statusCode >= 500) {
      this.logger.error(
        `${request.method} ${request.url} -> ${statusCode}: ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(statusCode).json(ApiResponse.error(message, statusCode, errors));
  }
}
