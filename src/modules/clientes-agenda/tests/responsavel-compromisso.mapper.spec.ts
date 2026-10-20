import { mapearResponsavelCompromisso } from '../mappers/responsavel-compromisso.mapper';

describe('mapearResponsavelCompromisso', () => {
  it('devolve tipo, id, nome, e-mail e documento', () => {
    expect(
      mapearResponsavelCompromisso({
        tipo: 'interno',
        id: 8n,
        nome: 'Consultor',
        email: 'consultor@letscom.com',
        documento: null,
      }),
    ).toEqual({
      tipo: 'interno',
      id: 8n,
      nome: 'Consultor',
      email: 'consultor@letscom.com',
      documento: null,
    });
  });

  it.each([null, '  '])('subordinado sem nome (%s) usa o e-mail', (nome) => {
    expect(
      mapearResponsavelCompromisso({
        tipo: 'subordinado',
        id: 3n,
        nome,
        email: 'sub@cliente.com',
        documento: '12345678900',
      }).nome,
    ).toBe('sub@cliente.com');
  });
});
