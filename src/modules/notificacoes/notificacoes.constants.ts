/** Valores da coluna notificacoes.tipo (VARCHAR para novos tipos não exigirem migration). */
export const TIPOS_NOTIFICACAO = {
  ANOTACAO_CLIENTE: 'anotacao_cliente',
  /** Convite para participar da conversa do cliente (aceitar/recusar pela notificação). */
  CONVITE_CONVERSA: 'convite_conversa',
} as const;

export type TipoNotificacao = (typeof TIPOS_NOTIFICACAO)[keyof typeof TIPOS_NOTIFICACAO];

/** Quem recebe: usuário da tabela users OU subordinado (users_cliente). */
export type DestinatarioNotificacao = { userId: bigint } | { subordinadoId: bigint };

export type DadosNotificacao = {
  tipo: TipoNotificacao;
  titulo: string;
  mensagem: string;
  link?: string | null;
  anotacaoId?: bigint | null;
  participanteId?: bigint | null;
};

export const TAMANHO_MAXIMO_MENSAGEM_NOTIFICACAO = 500;
/** Coluna titulo é VARCHAR(191). */
export const TAMANHO_MAXIMO_TITULO_NOTIFICACAO = 191;

/** Marcador de texto cortado (reticências, U+2026). */
export const RETICENCIAS = '\u2026';

/** Corta o texto no limite, terminando com reticências quando precisar cortar. */
export function cortarTexto(texto: string, limite: number): string {
  return texto.length > limite ? `${texto.slice(0, limite - 1)}${RETICENCIAS}` : texto;
}
