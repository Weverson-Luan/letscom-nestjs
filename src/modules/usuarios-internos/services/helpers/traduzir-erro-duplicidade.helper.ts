import { Prisma } from '@prisma/client';
import { UsuarioInternoDuplicadoException } from '../../exceptions/usuario-interno-duplicado.exception';

const MENSAGENS_POR_INDICE: ReadonlyArray<[indice: string, mensagem: string]> = [
  ['users_email', 'Já existe um usuário com este e-mail.'],
  ['users_telefone', 'Já existe um usuário com este telefone.'],
  ['users_documento', 'Já existe um usuário com este documento.'],
];

/**
 * Converte violação de índice único do Prisma (P2002) em 409 com mensagem por campo.
 * Qualquer outro erro é devolvido sem alteração para ser relançado.
 */
export function traduzirErroDuplicidade(erro: unknown): unknown {
  if (!(erro instanceof Prisma.PrismaClientKnownRequestError) || erro.code !== 'P2002') {
    return erro;
  }
  const alvo = erro.meta?.target;
  const indice = typeof alvo === 'string' ? alvo : Array.isArray(alvo) ? alvo.join('_') : '';
  const mensagem =
    MENSAGENS_POR_INDICE.find(([prefixo]) => indice.startsWith(prefixo))?.[1] ??
    MENSAGENS_POR_INDICE.find(([prefixo]) => prefixo.endsWith(`_${indice}`))?.[1] ??
    'Já existe um usuário com estes dados.';
  return new UsuarioInternoDuplicadoException(mensagem);
}
