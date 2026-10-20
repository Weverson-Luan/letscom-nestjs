import { ConversaParticipanteStatus, Notificacao } from '@prisma/client';

type NotificacaoComConvite = Notificacao & {
  participante?: { id: bigint; status: ConversaParticipanteStatus } | null;
};

/** `convite` vem preenchido nas notificações de convite: o front mostra aceitar/recusar se pendente. */
export function mapearNotificacao(notificacao: NotificacaoComConvite) {
  return {
    id: notificacao.id,
    tipo: notificacao.tipo,
    titulo: notificacao.titulo,
    mensagem: notificacao.mensagem,
    link: notificacao.link,
    conversa_mensagem_id: notificacao.conversaMensagemId,
    convite: notificacao.participante
      ? { id: notificacao.participante.id, status: notificacao.participante.status }
      : null,
    lida: notificacao.lidaEm !== null,
    lida_em: notificacao.lidaEm,
    created_at: notificacao.createdAt,
  };
}
