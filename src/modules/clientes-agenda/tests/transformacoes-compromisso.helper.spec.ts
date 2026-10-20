import { TransformFnParams } from 'class-transformer';
import { aparar, foiInformado } from '../dto/transformacoes-compromisso.helper';

describe('aparar', () => {
  const chamar = (value: unknown) => aparar({ value } as TransformFnParams);

  it('remove espaços das pontas de textos', () => {
    expect(chamar('  Reunião ')).toBe('Reunião');
  });

  it.each([123, null, undefined])('devolve %s sem alterar quando não é texto', (valor) => {
    expect(chamar(valor)).toBe(valor);
  });
});

describe('foiInformado', () => {
  it('ignora só o campo ausente', () => {
    expect(foiInformado({}, undefined)).toBe(false);
  });

  it.each([null, '', 0, false])('valida quando o campo veio (%p)', (valor) => {
    expect(foiInformado({}, valor)).toBe(true);
  });
});
