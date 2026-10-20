import {
  chaveCodigoAcessoBackoffice,
  TTL_CODIGO_ACESSO_BACKOFFICE_SEGUNDOS,
} from '../services/helpers/codigo-acesso-backoffice.helper';

describe('codigo-acesso-backoffice.helper', () => {
  const codigo = 'c'.repeat(64);

  it('gera a mesma chave para o mesmo código (hash determinístico)', () => {
    expect(chaveCodigoAcessoBackoffice(codigo)).toBe(chaveCodigoAcessoBackoffice(codigo));
  });

  it('gera chaves diferentes para códigos diferentes', () => {
    expect(chaveCodigoAcessoBackoffice(codigo)).not.toBe(
      chaveCodigoAcessoBackoffice('d'.repeat(64)),
    );
  });

  it('usa o prefixo do auth e o SHA-256 do código, nunca o código em claro', () => {
    const chave = chaveCodigoAcessoBackoffice(codigo);

    expect(chave).toMatch(/^auth:codigo-acesso-backoffice:[0-9a-f]{64}$/);
    expect(chave).not.toContain(codigo);
  });

  it('expira em 60 segundos', () => {
    expect(TTL_CODIGO_ACESSO_BACKOFFICE_SEGUNDOS).toBe(60);
  });
});
