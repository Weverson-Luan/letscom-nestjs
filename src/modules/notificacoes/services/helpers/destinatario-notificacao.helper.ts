import { Prisma } from '@prisma/client';
import { AuthUser } from 'src/shared/decorators/current-user.decorator';
import { DestinatarioNotificacao } from '../../notificacoes.constants';

/** Destinatário correspondente ao usuário logado (users ou users_cliente). */
export function montarDestinatarioDoUsuario(usuario: AuthUser): DestinatarioNotificacao {
  return usuario.tipoLogin === 'subordinado'
    ? { subordinadoId: usuario.id }
    : { userId: usuario.id };
}

/** Filtro Prisma da caixa de entrada de um destinatário. */
export function montarFiltroDestinatario(
  destinatario: DestinatarioNotificacao,
): Prisma.NotificacaoWhereInput {
  return 'userId' in destinatario
    ? { destinatarioUserId: destinatario.userId }
    : { destinatarioSubordinadoId: destinatario.subordinadoId };
}

/** Remove destinatários repetidos (mesmo usuário vindo de mais de uma regra). */
export function removerDestinatariosRepetidos(
  destinatarios: DestinatarioNotificacao[],
): DestinatarioNotificacao[] {
  const vistos = new Set<string>();
  return destinatarios.filter((destinatario) => {
    const chave =
      'userId' in destinatario ? `u:${destinatario.userId}` : `s:${destinatario.subordinadoId}`;
    if (vistos.has(chave)) return false;
    vistos.add(chave);
    return true;
  });
}
