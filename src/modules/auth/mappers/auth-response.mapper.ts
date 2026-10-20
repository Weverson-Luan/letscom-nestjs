import { Prisma } from '@prisma/client';

/** Remove a senha de um objeto de usuário (equivale ao $hidden do Eloquent). */
export function serializeUser<T extends { senha?: string }>(
  user: T | null,
): Omit<T, 'senha'> | null {
  if (!user) return null;
  const { senha: _senha, ...rest } = user;
  return rest;
}

export type RoleData = Prisma.RoleGetPayload<object> | null;

/** Resposta do login de usuário interno (mesmo formato do `POST /login` do Laravel). */
export function mapearRespostaLogin(params: {
  user: {
    id: bigint;
    nome: string | null;
    email: string;
    documento: string | null;
    tipoPessoa: string | null;
  };
  consultor: ReturnType<typeof serializeUser> | null;
  role: RoleData;
  features: string[];
  accessToken: string;
  refreshToken: string;
}) {
  const { user, consultor, role, features, accessToken, refreshToken } = params;

  return {
    code: 200,
    message: 'Usuário logado com sucesso!',
    data: {
      id: user.id,
      tipo_login: 'user',
      nome: user.nome,
      email: user.email,
      documento: user.documento ?? null,
      tipo_pessoa: user.tipoPessoa,
      consultor,
      roles: role,
      features,
    },
    access_token: accessToken,
    refresh_token: refreshToken,
  };
}

/** Resposta da geração do código de acesso ao backoffice. */
export function mapearCodigoAcessoBackoffice(codigo: string, expiraEmSegundos: number) {
  return {
    code: 200,
    message: 'Código de acesso ao backoffice gerado com sucesso!',
    data: { codigo, expira_em_segundos: expiraEmSegundos },
  };
}
