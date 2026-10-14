import { resolverClienteAutenticado } from '../services/helpers/resolver-cliente-autenticado.helper';

describe('resolverClienteAutenticado', () => {
  it('devolve o próprio id no login de cliente', () => {
    expect(resolverClienteAutenticado({ id: 10n, tipoLogin: 'user', clienteId: null })).toBe(10n);
  });

  it('devolve o cliente principal no login de subordinado', () => {
    expect(resolverClienteAutenticado({ id: 99n, tipoLogin: 'subordinado', clienteId: 10n })).toBe(
      10n,
    );
  });

  it('devolve null quando o subordinado não tem cliente', () => {
    expect(
      resolverClienteAutenticado({ id: 99n, tipoLogin: 'subordinado', clienteId: null }),
    ).toBeNull();
  });
});
