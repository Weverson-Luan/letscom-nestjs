import { converterTextoVazioEmNulo } from './converter-texto-vazio-em-nulo';

describe('converterTextoVazioEmNulo', () => {
  it.each([undefined, null, '', '   ', 'undefined', 'UNDEFINED', ' null '])(
    'converte %p em null',
    (valor) => {
      expect(converterTextoVazioEmNulo(valor)).toBeNull();
    },
  );

  it('devolve o texto sem espaços nas pontas', () => {
    expect(converterTextoVazioEmNulo('  matricula ')).toBe('matricula');
  });
});
