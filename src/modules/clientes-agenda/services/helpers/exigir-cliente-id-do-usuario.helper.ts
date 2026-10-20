import { AuthUser } from 'src/shared/decorators/current-user.decorator';
import { ClienteNaoEncontradoException } from '../../exceptions/cliente-nao-encontrado.exception';

/**
 * Empresa (users.id do cliente principal) do usuário logado do lado do cliente:
 * o próprio id para o cliente principal, `clienteId` do token para o subordinado.
 * Sem empresa vinculada é 404.
 */
export function exigirClienteIdDoUsuario(usuario: AuthUser): bigint {
  const clienteId = usuario.tipoLogin === 'subordinado' ? usuario.clienteId : usuario.id;
  if (!clienteId) throw new ClienteNaoEncontradoException();
  return clienteId;
}
