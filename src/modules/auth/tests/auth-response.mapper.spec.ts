import { serializeUser } from '../mappers/auth-response.mapper';

describe('auth-response.mapper', () => {
  it('serializeUser remove a senha do objeto', () => {
    const user = {
      id: BigInt(1),
      nome: 'Cliente Letscom',
      email: 'cliente@letscom.com',
      senha: 'hash-secreto',
      ativo: true,
    };

    expect(serializeUser(user)).toEqual({
      id: BigInt(1),
      nome: 'Cliente Letscom',
      email: 'cliente@letscom.com',
      ativo: true,
    });
  });

  it('serializeUser retorna null quando usuário é null', () => {
    expect(serializeUser(null)).toBeNull();
  });
});
