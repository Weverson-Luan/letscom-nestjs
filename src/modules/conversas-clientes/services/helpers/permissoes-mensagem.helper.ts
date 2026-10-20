import { ConversaMensagemAutorTipo } from '@prisma/client';
import { Role } from 'src/shared/constants/roles';
import { AuthUser } from 'src/shared/decorators/current-user.decorator';

type AutoriaMensagem = {
  autorId: bigint | null;
  autorSubordinadoId: bigint | null;
  autorTipo: ConversaMensagemAutorTipo;
};

/** O usuário logado escreveu esta mensagem? Subordinado é comparado com users_cliente.id. */
export function ehAutorMensagem(mensagem: AutoriaMensagem, usuario: AuthUser): boolean {
  if (usuario.tipoLogin === 'subordinado') {
    return mensagem.autorTipo === 'subordinado' && mensagem.autorSubordinadoId === usuario.id;
  }
  return mensagem.autorTipo !== 'subordinado' && mensagem.autorId === usuario.id;
}

/** Só o autor interno edita o que escreveu (o cliente só responde). */
export function podeEditarMensagem(mensagem: AutoriaMensagem, usuario: AuthUser): boolean {
  return mensagem.autorTipo === 'interno' && ehAutorMensagem(mensagem, usuario);
}

/** O autor interno ou um admin pode excluir (inclusive mensagens do cliente). */
export function podeExcluirMensagem(mensagem: AutoriaMensagem, usuario: AuthUser): boolean {
  if (usuario.tipoLogin === 'subordinado' || usuario.roles.includes(Role.CLIENTE)) return false;
  return podeEditarMensagem(mensagem, usuario) || usuario.roles.includes(Role.ADMIN);
}
