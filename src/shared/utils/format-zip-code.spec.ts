import { formatarCep } from './format-zip-code';

describe('formatarCep', () => {
  it('formata CEP com 8 dígitos', () => {
    expect(formatarCep('01310100')).toBe('01310-100');
    expect(formatarCep('01310-100')).toBe('01310-100');
  });

  it('retorna valor original quando não tem 8 dígitos', () => {
    expect(formatarCep('123')).toBe('123');
    expect(formatarCep('')).toBe('');
  });
});
