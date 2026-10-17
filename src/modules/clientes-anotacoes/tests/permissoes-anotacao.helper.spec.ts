import {
  ehAutorAnotacao,
  podeEditarAnotacao,
  podeExcluirAnotacao,
} from '../services/helpers/permissoes-anotacao.helper';
import { criarUsuarioLogadoFake } from './fixtures';

describe('permissoes de anotação', () => {
  const interna = { autorId: 7n, autorSubordinadoId: null, autorTipo: 'interno' as const };
  const doCliente = { autorId: 5n, autorSubordinadoId: null, autorTipo: 'cliente' as const };
  const doSubordinado = {
    autorId: null,
    autorSubordinadoId: 7n,
    autorTipo: 'subordinado' as const,
  };

  const autor = criarUsuarioLogadoFake();
  const outro = criarUsuarioLogadoFake({ id: 8n });
  const admin = criarUsuarioLogadoFake({ id: 9n, roles: ['admin'] });
  const cliente = criarUsuarioLogadoFake({ id: 5n, roles: ['cliente'] });
  const subordinado = criarUsuarioLogadoFake({
    id: 7n,
    tipoLogin: 'subordinado',
    clienteId: 5n,
    roles: ['subordinado'],
  });

  it('identifica o autor pelo tipo de login (users x users_cliente com o mesmo id)', () => {
    expect(ehAutorAnotacao(interna, autor)).toBe(true);
    expect(ehAutorAnotacao(interna, outro)).toBe(false);
    expect(ehAutorAnotacao(doSubordinado, subordinado)).toBe(true);
    expect(ehAutorAnotacao(doSubordinado, autor)).toBe(false);
    expect(ehAutorAnotacao(interna, subordinado)).toBe(false);
    expect(ehAutorAnotacao(doCliente, cliente)).toBe(true);
  });

  it('só o autor interno edita; nem admin nem cliente editam', () => {
    expect(podeEditarAnotacao(interna, autor)).toBe(true);
    expect(podeEditarAnotacao(interna, outro)).toBe(false);
    expect(podeEditarAnotacao(interna, admin)).toBe(false);
    expect(podeEditarAnotacao(doCliente, cliente)).toBe(false);
    expect(podeEditarAnotacao(doSubordinado, subordinado)).toBe(false);
  });

  it('autor interno ou admin excluem; lado do cliente nunca exclui', () => {
    expect(podeExcluirAnotacao(interna, autor)).toBe(true);
    expect(podeExcluirAnotacao(interna, admin)).toBe(true);
    expect(podeExcluirAnotacao(doCliente, admin)).toBe(true);
    expect(podeExcluirAnotacao(interna, outro)).toBe(false);
    expect(podeExcluirAnotacao(doCliente, cliente)).toBe(false);
    expect(podeExcluirAnotacao(doSubordinado, subordinado)).toBe(false);
  });
});
