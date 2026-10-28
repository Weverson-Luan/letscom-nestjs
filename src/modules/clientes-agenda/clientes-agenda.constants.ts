import { Role } from 'src/shared/constants/roles';

/** Papéis do backoffice que acessam a agenda do cliente (o acesso fino é por feature flag). */
export const PAPEIS_AGENDA_INTERNO = [
  Role.ADMIN,
  Role.CONSULTOR,
  Role.PRODUCAO,
  Role.RECEPCAO,
  Role.EXPEDICAO,
] as const;

/** Papéis do lado do cliente que acessam /minha-agenda. */
export const PAPEIS_AGENDA_CLIENTE = [Role.CLIENTE, Role.SUBORDINADO] as const;

/** Papéis que podem ser responsáveis por um compromisso. */
export const PAPEIS_RESPONSAVEL_COMPROMISSO = PAPEIS_AGENDA_INTERNO;

export const TAMANHO_MAXIMO_TITULO = 191;
export const TAMANHO_MAXIMO_DESCRICAO = 5000;
export const POR_PAGINA_PADRAO_RESPONSAVEIS = 20;
export const POR_PAGINA_MAXIMO_RESPONSAVEIS = 50;
export const POR_PAGINA_PADRAO_AGENDA = 20;
export const POR_PAGINA_MAXIMO_AGENDA = 50;

export const NOME_USUARIO_REMOVIDO = 'Usuário removido';

export const MAXIMO_ANEXOS_POR_COMPROMISSO = 5;
export const TAMANHO_MAXIMO_ANEXO_BYTES = 10 * 1024 * 1024;

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
