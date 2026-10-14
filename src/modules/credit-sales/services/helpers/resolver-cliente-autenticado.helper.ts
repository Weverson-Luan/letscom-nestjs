import { AuthUser } from 'src/shared/decorators/current-user.decorator';

/**
 * Id do cliente dono dos dados do usuário logado: o próprio usuário (login de cliente)
 * ou o cliente principal (login de subordinado). `null` quando o subordinado não tem cliente.
 */
export function resolverClienteAutenticado(
  usuario: Pick<AuthUser, 'id' | 'tipoLogin' | 'clienteId'>,
): bigint | null {
  if (usuario.tipoLogin === 'subordinado') return usuario.clienteId ?? null;
  return usuario.id;
}
