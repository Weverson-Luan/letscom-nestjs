import { AuthUser } from 'src/shared/decorators/current-user.decorator';

export type AutorStatus = Pick<AuthUser, 'id' | 'tipoLogin'>;

/**
 * Autor gravado no histórico de status (remessas_status.user_id referencia `users`).
 * Subordinado vive em users_cliente, então fica sem autor.
 */
export function extrairAutorStatus(autor: AutorStatus | null | undefined): bigint | null {
  if (!autor || autor.tipoLogin !== 'user') return null;
  return autor.id;
}
