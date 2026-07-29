import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { sanitizePayload } from '../utils/logger';

/**
 * Equivalente ao LogRequestMiddleware do Laravel: loga cada requisição
 * (método, url, ip, user_id) e o status da resposta, sem expor dados sensíveis.
 * Ignora respostas de download binário.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const { method, originalUrl, ip } = request;
    const userId = (request as any).user?.id?.toString?.() ?? null;
    const startedAt = Date.now();

    this.logger.log(
      `--> ${method} ${originalUrl} ip=${ip} user=${userId ?? '-'} body=${JSON.stringify(
        sanitizePayload(request.body as Record<string, unknown>),
      )}`,
    );

    return next.handle().pipe(
      tap(() => {
        const ms = Date.now() - startedAt;
        this.logger.log(
          `<-- ${method} ${originalUrl} ${response.statusCode} (${ms}ms)`,
        );
      }),
    );
  }
}
