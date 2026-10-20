import { Role } from 'src/shared/constants/roles';

export const MAXIMO_ANEXOS_POR_MENSAGEM = 5;
export const TAMANHO_MAXIMO_ANEXO_BYTES = 10 * 1024 * 1024;
export const TAMANHO_MAXIMO_CONTEUDO = 5000;

/** Validação por extensão: o mimetype vem do navegador e não é confiável. */
export const EXTENSOES_ANEXO_PERMITIDAS = [
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'csv',
  'txt',
  'zip',
] as const;

/** Arquivo recebido pelo Multer (memoryStorage). */
export type ArquivoAnexo = {
  buffer: Buffer;
  originalname: string;
  mimetype?: string;
  size?: number;
};

/** Papéis do backoffice que acessam as mensagens (o acesso fino é por feature flag). */
export const PAPEIS_CONVERSA_INTERNO = [
  Role.ADMIN,
  Role.CONSULTOR,
  Role.PRODUCAO,
  Role.RECEPCAO,
] as const;

/** Papéis do lado do cliente que acessam /minha-conversa. */
export const PAPEIS_CONVERSA_CLIENTE = [Role.CLIENTE, Role.SUBORDINADO] as const;

/** Pessoa na conversa: usuário da tabela users (interno ou cliente principal) OU subordinado. */
export type PessoaConversa = { userId: bigint } | { subordinadoId: bigint };

/** Lado da conversa: equipe Letscom ou empresa do cliente (principal e subordinados). */
export type LadoConversa = 'interno' | 'cliente';

/** Papéis que respondem convites de conversa (equipe e lado do cliente). */
export const PAPEIS_CONVITE_CONVERSA = [
  ...PAPEIS_CONVERSA_INTERNO,
  ...PAPEIS_CONVERSA_CLIENTE,
] as const;

/** Papéis internos que podem ser convidados para a conversa. */
export const PAPEIS_INTERNOS_CONVIDAVEIS = PAPEIS_CONVERSA_INTERNO;

export const MAXIMO_CANDIDATOS_CONVITE = 50;

/** Quem escreve a mensagem (resolvido a partir do usuário logado). */
export type AutorMensagem =
  | { tipo: 'interno' | 'cliente'; userId: bigint; nome: string }
  | { tipo: 'subordinado'; subordinadoId: bigint; nome: string };

/** Links do backoffice usados nas notificações. */
export function montarLinkConversaInterno(clienteId: bigint): string {
  return `/clientes/${clienteId}`;
}
export const LINK_MINHA_CONVERSA = '/minha-conversa';
