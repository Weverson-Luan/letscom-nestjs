import { AuthUser } from 'src/shared/decorators/current-user.decorator';
import { ClienteNaoEncontradoException } from '../../exceptions/cliente-nao-encontrado.exception';
import { AutorMensagem } from '../../conversas-clientes.constants';

function montarNomeExibicao(usuario: AuthUser): string {
  return usuario.nome?.trim() || usuario.email;
}

/** Autor interno (admin/consultor/produção/recepção) — sempre da tabela users. */
export function montarAutorInterno(usuario: AuthUser): AutorMensagem {
  return { tipo: 'interno', userId: usuario.id, nome: montarNomeExibicao(usuario) };
}

/** Autor do lado do cliente: cliente principal (users) ou subordinado (users_cliente). */
export function montarAutorCliente(usuario: AuthUser): AutorMensagem {
  return usuario.tipoLogin === 'subordinado'
    ? { tipo: 'subordinado', subordinadoId: usuario.id, nome: montarNomeExibicao(usuario) }
    : { tipo: 'cliente', userId: usuario.id, nome: montarNomeExibicao(usuario) };
}

/** Empresa (users.id do cliente principal) do usuário logado do lado do cliente. */
export function extrairClienteIdDoUsuario(usuario: AuthUser): bigint | null {
  if (usuario.tipoLogin === 'subordinado') return usuario.clienteId ?? null;
  return usuario.id;
}

/** Empresa do usuário do lado do cliente; sem empresa vinculada é 404. */
export function exigirClienteIdDoUsuario(usuario: AuthUser): bigint {
  const clienteId = extrairClienteIdDoUsuario(usuario);
  if (!clienteId) throw new ClienteNaoEncontradoException();
  return clienteId;
}
