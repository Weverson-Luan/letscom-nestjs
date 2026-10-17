import { ClienteAnotacaoAutorTipo } from '@prisma/client';
import { Role } from 'src/shared/constants/roles';
import { AuthUser } from 'src/shared/decorators/current-user.decorator';

type AutoriaAnotacao = {
  autorId: bigint | null;
  autorSubordinadoId: bigint | null;
  autorTipo: ClienteAnotacaoAutorTipo;
};

/** O usuário logado escreveu esta anotação? Subordinado é comparado com users_cliente.id. */
export function ehAutorAnotacao(anotacao: AutoriaAnotacao, usuario: AuthUser): boolean {
  if (usuario.tipoLogin === 'subordinado') {
    return anotacao.autorTipo === 'subordinado' && anotacao.autorSubordinadoId === usuario.id;
  }
  return anotacao.autorTipo !== 'subordinado' && anotacao.autorId === usuario.id;
}

/** Só o autor interno edita o que escreveu (o cliente só responde). */
export function podeEditarAnotacao(anotacao: AutoriaAnotacao, usuario: AuthUser): boolean {
  return anotacao.autorTipo === 'interno' && ehAutorAnotacao(anotacao, usuario);
}

/** O autor interno ou um admin pode excluir (inclusive mensagens do cliente). */
export function podeExcluirAnotacao(anotacao: AutoriaAnotacao, usuario: AuthUser): boolean {
  if (usuario.tipoLogin === 'subordinado' || usuario.roles.includes(Role.CLIENTE)) return false;
  return podeEditarAnotacao(anotacao, usuario) || usuario.roles.includes(Role.ADMIN);
}
