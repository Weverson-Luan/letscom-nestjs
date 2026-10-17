import { Notificacao } from '@prisma/client';

export function mapearNotificacao(notificacao: Notificacao) {
  return {
    id: notificacao.id,
    tipo: notificacao.tipo,
    titulo: notificacao.titulo,
    mensagem: notificacao.mensagem,
    link: notificacao.link,
    anotacao_id: notificacao.anotacaoId,
    lida: notificacao.lidaEm !== null,
    lida_em: notificacao.lidaEm,
    created_at: notificacao.createdAt,
  };
}
