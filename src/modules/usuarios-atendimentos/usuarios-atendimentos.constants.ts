/**
 * IMPORTS
 */
import { Prisma } from '@prisma/client';

/**
 * Campos do usuário dono devolvidos junto com o atendimento. Nunca usar `user: true`:
 * traria senha (hash), documento e telefone do dono para a resposta HTTP.
 */
export const INCLUIR_USUARIO_DONO = {
  user: { select: { id: true, nome: true, email: true } },
} satisfies Prisma.UserAtendimentoInclude;
