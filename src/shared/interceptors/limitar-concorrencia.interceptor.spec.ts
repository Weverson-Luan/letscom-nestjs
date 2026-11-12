/**
 * IMPORTS
 */
import { ExecutionContext } from '@nestjs/common';
import { Subject } from 'rxjs';

// shared / interceptors (interceptor testado)
import {
  LIMITE_CONCORRENCIA_ARQUIVOS,
  LimitarConcorrenciaInterceptor,
} from './limitar-concorrencia.interceptor';

function criarContexto() {
  const resposta = { setHeader: jest.fn() };
  const contexto = {
    switchToHttp: () => ({ getResponse: () => resposta }),
  } as unknown as ExecutionContext;
  return { contexto, resposta };
}

describe('LimitarConcorrenciaInterceptor', () => {
  const interceptor = new LimitarConcorrenciaInterceptor();

  beforeEach(() => LimitarConcorrenciaInterceptor.reiniciarContador());

  it('recusa com 503 e Retry-After quando o limite simultâneo é atingido', () => {
    const fluxos = Array.from({ length: LIMITE_CONCORRENCIA_ARQUIVOS }, () => new Subject());
    fluxos.forEach((fluxo) => {
      interceptor.intercept(criarContexto().contexto, { handle: () => fluxo }).subscribe();
    });

    const { contexto, resposta } = criarContexto();

    expect(() => interceptor.intercept(contexto, { handle: () => new Subject() })).toThrow(
      expect.objectContaining({ status: 503 }),
    );
    expect(resposta.setHeader).toHaveBeenCalledWith('Retry-After', '5');
  });

  it('libera a vaga quando a requisição termina', () => {
    const fluxos = Array.from({ length: LIMITE_CONCORRENCIA_ARQUIVOS }, () => new Subject());
    fluxos.forEach((fluxo) => {
      interceptor.intercept(criarContexto().contexto, { handle: () => fluxo }).subscribe();
    });

    fluxos[0].complete();

    expect(() =>
      interceptor.intercept(criarContexto().contexto, { handle: () => new Subject() }),
    ).not.toThrow();
  });

  it('libera a vaga quando a requisição falha', () => {
    const fluxo = new Subject();
    interceptor
      .intercept(criarContexto().contexto, { handle: () => fluxo })
      .subscribe({ error: () => undefined });
    fluxo.error(new Error('falhou'));

    const fluxos = Array.from({ length: LIMITE_CONCORRENCIA_ARQUIVOS }, () => new Subject());
    expect(() =>
      fluxos.forEach((f) =>
        interceptor.intercept(criarContexto().contexto, { handle: () => f }).subscribe(),
      ),
    ).not.toThrow();
  });
});
