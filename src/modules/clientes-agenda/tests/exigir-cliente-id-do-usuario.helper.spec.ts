import { ClienteNaoEncontradoException } from '../exceptions/cliente-nao-encontrado.exception';
import { exigirClienteIdDoUsuario } from '../services/helpers/exigir-cliente-id-do-usuario.helper';
import { criarUsuarioLogadoFake } from './fixtures';

describe('exigirClienteIdDoUsuario', () => {
  it('cliente principal usa o próprio id', () => {
    expect(exigirClienteIdDoUsuario(criarUsuarioLogadoFake({ id: 5n, roles: ['cliente'] }))).toBe(
      5n,
    );
  });

  it('subordinado usa o clienteId do token', () => {
    const subordinado = criarUsuarioLogadoFake({ id: 3n, tipoLogin: 'subordinado', clienteId: 5n });
    expect(exigirClienteIdDoUsuario(subordinado)).toBe(5n);
  });

  it.each([null, undefined])('lança 404 para subordinado sem empresa (%s)', (clienteId) => {
    const subordinado = criarUsuarioLogadoFake({ tipoLogin: 'subordinado', clienteId });
    expect(() => exigirClienteIdDoUsuario(subordinado)).toThrow(ClienteNaoEncontradoException);
  });
});
