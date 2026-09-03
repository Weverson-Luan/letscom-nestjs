import { validateEnv } from './env.validation';

describe('validateEnv', () => {
  it('valida variáveis obrigatórias mínimas', () => {
    const result = validateEnv({
      APP_CONTEXT: 'apiparcelas',
      DATABASE_URL: 'mysql://user:pass@localhost:3306/letscom',
      JWT_SECRET: 'secret-test',
    });

    expect(result.APP_CONTEXT).toBe('apiparcelas');
    expect(result.DATABASE_URL).toBe('mysql://user:pass@localhost:3306/letscom');
    expect(result.JWT_SECRET).toBe('secret-test');
    expect(result.APP_PORT).toBe(3000);
    expect(result.JWT_ACCESS_TTL_DAYS).toBe(7);
  });

  it('falha quando JWT_SECRET está ausente', () => {
    expect(() =>
      validateEnv({
        APP_CONTEXT: 'apiparcelas',
        DATABASE_URL: 'mysql://user:pass@localhost:3306/letscom',
      }),
    ).toThrow('Erro de validação das variáveis de ambiente');
  });

  it('falha quando APP_CONTEXT está ausente', () => {
    expect(() =>
      validateEnv({
        DATABASE_URL: 'mysql://user:pass@localhost:3306/letscom',
        JWT_SECRET: 'secret-test',
      }),
    ).toThrow('Erro de validação das variáveis de ambiente');
  });
});
