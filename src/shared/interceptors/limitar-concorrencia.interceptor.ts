import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, finalize } from 'rxjs';

/** Máximo de requisições simultâneas por processo nos endpoints de processamento pesado. */
export const LIMITE_CONCORRENCIA_ARQUIVOS = 3;

/**
 * Limita quantas requisições pesadas (upload/download/processamento de planilha e ZIP)
 * rodam ao mesmo tempo no processo. Acima do limite responde 503 com Retry-After,
 * em vez de acumular workbooks/buffers na memória até derrubar a API.
 */
@Injectable()
export class LimitarConcorrenciaInterceptor implements NestInterceptor {
  private static emAndamento = 0;

  static reiniciarContador() {
    LimitarConcorrenciaInterceptor.emAndamento = 0;
  }

  intercept(contexto: ExecutionContext, proximo: CallHandler): Observable<unknown> {
    if (LimitarConcorrenciaInterceptor.emAndamento >= LIMITE_CONCORRENCIA_ARQUIVOS) {
      contexto.switchToHttp().getResponse()?.setHeader?.('Retry-After', '5');
      throw new HttpException(
        'Servidor ocupado processando outros arquivos. Tente novamente em instantes.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    LimitarConcorrenciaInterceptor.emAndamento++;
    return proximo
      .handle()
      .pipe(
        finalize(
          () =>
            (LimitarConcorrenciaInterceptor.emAndamento = Math.max(
              0,
              LimitarConcorrenciaInterceptor.emAndamento - 1,
            )),
        ),
      );
  }
}
