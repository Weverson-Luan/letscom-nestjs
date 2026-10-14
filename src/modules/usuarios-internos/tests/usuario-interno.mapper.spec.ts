import { mapearUsuarioInterno } from '../mappers/usuario-interno.mapper';
import { criarUsuarioFake } from './fixtures';

describe('mapearUsuarioInterno', () => {
  it('mapeia o usuário com o papel e sem expor a senha', () => {
    const usuario = criarUsuarioFake();

    const resultado = mapearUsuarioInterno(usuario, 'producao');

    expect(resultado).toEqual({
      id: 12n,
      nome: 'Maria Silva',
      email: 'maria@letscom.com',
      telefone: '11999999999',
      documento: '12345678901',
      tipo_pessoa: 'F',
      ativo: true,
      papel: 'producao',
      created_at: usuario.createdAt,
      updated_at: usuario.updatedAt,
    });
    expect(resultado).not.toHaveProperty('senha');
  });
});
