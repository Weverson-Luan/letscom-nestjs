/**
 * Mensagens por índice único violado (meta.target do erro P2002 do Prisma).
 * `users_cliente_*` vem antes de `users_*`: o nome do índice do subordinado também começa com `users_`.
 */
const MENSAGENS_POR_INDICE: ReadonlyArray<[indice: string, mensagem: string]> = [
  ['users_cliente_email', 'Já existe um usuário do cliente com este e-mail.'],
  ['users_email', 'Já existe um cliente com este e-mail.'],
  ['users_documento', 'Já existe um cliente com este documento.'],
  ['users_telefone', 'Já existe um cliente com este telefone.'],
];

const MENSAGEM_PADRAO = 'Já existe um cadastro com estes dados.';

/**
 * Monta a mensagem do 409 a partir do `meta.target` do P2002.
 * No MySQL o Prisma devolve o nome do índice (ex.: `users_email_key`); qualquer outro formato cai na mensagem padrão.
 */
export function montarMensagemCadastroDuplicado(alvo: unknown): string {
  const indice = typeof alvo === 'string' ? alvo : '';
  return (
    MENSAGENS_POR_INDICE.find(([prefixo]) => indice.startsWith(prefixo))?.[1] ?? MENSAGEM_PADRAO
  );
}
