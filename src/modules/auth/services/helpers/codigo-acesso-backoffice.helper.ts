/**
 * IMPORTS
 */

import { createHash } from 'crypto';

/** Validade do código de acesso ao backoffice (segundos): só o tempo de abrir a aba. */
const TTL_CODIGO_ACESSO_BACKOFFICE_SEGUNDOS = 60;

/** Chave no Redis: guarda só o hash do código, nunca o valor em claro. */
function chaveCodigoAcessoBackoffice(codigo: string): string {
  const hash = createHash('sha256').update(codigo).digest('hex');
  return `auth:codigo-acesso-backoffice:${hash}`;
}

/** Valor guardado no Redis (BigInt não serializa em JSON). */
interface CodigoAcessoBackofficeCache {
  userId: string;
}

/**
 * EXPORTS
 */
export {
  TTL_CODIGO_ACESSO_BACKOFFICE_SEGUNDOS,
  chaveCodigoAcessoBackoffice,
  type CodigoAcessoBackofficeCache,
};
