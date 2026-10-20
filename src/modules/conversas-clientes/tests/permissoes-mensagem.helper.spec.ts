import {
  ehAutorMensagem,
  podeEditarMensagem,
  podeExcluirMensagem,
} from '../services/helpers/permissoes-mensagem.helper';
import { criarUsuarioLogadoFake } from './fixtures';

describe('permissoes de mensagem', () => {
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
    expect(ehAutorMensagem(interna, autor)).toBe(true);
    expect(ehAutorMensagem(interna, outro)).toBe(false);
    expect(ehAutorMensagem(doSubordinado, subordinado)).toBe(true);
    expect(ehAutorMensagem(doSubordinado, autor)).toBe(false);
    expect(ehAutorMensagem(interna, subordinado)).toBe(false);
    expect(ehAutorMensagem(doCliente, cliente)).toBe(true);
  });

  it('só o autor interno edita; nem admin nem cliente editam', () => {
    expect(podeEditarMensagem(interna, autor)).toBe(true);
    expect(podeEditarMensagem(interna, outro)).toBe(false);
    expect(podeEditarMensagem(interna, admin)).toBe(false);
    expect(podeEditarMensagem(doCliente, cliente)).toBe(false);
    expect(podeEditarMensagem(doSubordinado, subordinado)).toBe(false);
  });

  it('autor interno ou admin excluem; lado do cliente nunca exclui', () => {
    expect(podeExcluirMensagem(interna, autor)).toBe(true);
    expect(podeExcluirMensagem(interna, admin)).toBe(true);
    expect(podeExcluirMensagem(doCliente, admin)).toBe(true);
    expect(podeExcluirMensagem(interna, outro)).toBe(false);
    expect(podeExcluirMensagem(doCliente, cliente)).toBe(false);
    expect(podeExcluirMensagem(doSubordinado, subordinado)).toBe(false);
  });
});
