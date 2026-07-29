import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Usuário autenticado injetado pelo JwtStrategy/JwtAuthGuard.
 * Espelha o `$request->user()` do Laravel, com o discriminador `tipoLogin`.
 */
export interface AuthUser {
  id: bigint;
  email: string;
  nome: string | null;
  ativo: boolean;
  /** 'user' (interno) ou 'subordinado' (users_cliente) */
  tipoLogin: 'user' | 'subordinado';
  /** id do cliente principal quando tipoLogin = 'subordinado' */
  clienteId?: bigint | null;
  /** nomes das roles (coluna roles.nome) */
  roles: string[];
}

export const CurrentUser = createParamDecorator(
  (data: keyof AuthUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthUser;
    return data ? user?.[data] : user;
  },
);
