import { ClienteNaoEncontradoException } from '../exceptions/cliente-nao-encontrado.exception';
import {
  exigirClienteIdDoUsuario,
  extrairClienteIdDoUsuario,
  montarAutorCliente,
  montarAutorInterno,
} from '../services/helpers/resolver-usuario-conversa.helper';
import { criarUsuarioLogadoFake } from './fixtures';

describe('resolver usuário da mensagem', () => {
  const subordinado = criarUsuarioLogadoFake({
    id: 3n,
    nome: '  ',
    email: 'compras@x.com',
    tipoLogin: 'subordinado',
    clienteId: 5n,
  });

  it('monta autor interno e de cliente com fallback de nome para o e-mail', () => {
    expect(montarAutorInterno(criarUsuarioLogadoFake())).toEqual({
      tipo: 'interno',
      userId: 7n,
      nome: 'Operador',
    });
    expect(montarAutorCliente(criarUsuarioLogadoFake({ id: 5n, nome: 'Empresa' }))).toEqual({
      tipo: 'cliente',
      userId: 5n,
      nome: 'Empresa',
    });
    expect(montarAutorCliente(subordinado)).toEqual({
      tipo: 'subordinado',
      subordinadoId: 3n,
      nome: 'compras@x.com',
    });
  });

  it('extrai a empresa: o próprio id do cliente ou o clienteId do subordinado', () => {
    expect(extrairClienteIdDoUsuario(criarUsuarioLogadoFake({ id: 5n }))).toBe(5n);
    expect(extrairClienteIdDoUsuario(subordinado)).toBe(5n);
    expect(extrairClienteIdDoUsuario({ ...subordinado, clienteId: undefined })).toBeNull();
  });

  it('exige a empresa: principal usa o próprio id, subordinado a do vínculo, sem vínculo é 404', () => {
    expect(exigirClienteIdDoUsuario(criarUsuarioLogadoFake({ id: 5n, roles: ['cliente'] }))).toBe(
      5n,
    );
    expect(
      exigirClienteIdDoUsuario(criarUsuarioLogadoFake({ tipoLogin: 'subordinado', clienteId: 5n })),
    ).toBe(5n);
    expect(() =>
      exigirClienteIdDoUsuario(
        criarUsuarioLogadoFake({ tipoLogin: 'subordinado', clienteId: null }),
      ),
    ).toThrow(ClienteNaoEncontradoException);
  });
});
