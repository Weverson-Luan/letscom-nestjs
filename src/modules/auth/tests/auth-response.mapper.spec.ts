import {
  mapearCodigoAcessoBackoffice,
  mapearRespostaLogin,
  serializeUser,
} from '../mappers/auth-response.mapper';

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

describe('mapearRespostaLogin', () => {
  it('monta a resposta no formato do POST /login', () => {
    const resposta = mapearRespostaLogin({
      user: { id: BigInt(1), nome: 'Ana', email: 'ana@x.com', documento: null, tipoPessoa: 'F' },
      consultor: null,
      role: null,
      features: ['acessar_backoffice'],
      accessToken: 'a',
      refreshToken: 'r',
    });

    expect(resposta).toEqual({
      code: 200,
      message: 'Usuário logado com sucesso!',
      data: {
        id: BigInt(1),
        tipo_login: 'user',
        nome: 'Ana',
        email: 'ana@x.com',
        documento: null,
        tipo_pessoa: 'F',
        consultor: null,
        roles: null,
        features: ['acessar_backoffice'],
      },
      access_token: 'a',
      refresh_token: 'r',
    });
  });
});

describe('mapearCodigoAcessoBackoffice', () => {
  it('devolve o código e a validade em segundos', () => {
    expect(mapearCodigoAcessoBackoffice('abc', 60)).toEqual({
      code: 200,
      message: 'Código de acesso ao backoffice gerado com sucesso!',
      data: { codigo: 'abc', expira_em_segundos: 60 },
    });
  });
});
