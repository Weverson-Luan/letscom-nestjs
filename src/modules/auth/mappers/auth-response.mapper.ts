import { Prisma } from '@prisma/client';

/** Remove a senha de um objeto de usuário (equivale ao $hidden do Eloquent). */
export function serializeUser<T extends { senha?: string }>(user: T | null): Omit<T, 'senha'> | null {
  if (!user) return null;
  const { senha: _senha, ...rest } = user;
  return rest;
}

export type RoleData = Prisma.RoleGetPayload<object> | null;
