/** Textos que o front manda no lugar de "sem valor" (ex.: FormData com `undefined`). */
const TEXTOS_SEM_VALOR = ['', 'undefined', 'null'];

/**
 * Converte vazio, `'undefined'` e `'null'` (texto) em `null`; os demais textos voltam sem
 * espaços nas pontas. Evita gravar a palavra "undefined" no banco.
 */
export function converterTextoVazioEmNulo(valor: unknown): string | null {
  if (valor === undefined || valor === null) return null;
  const texto = String(valor).trim();
  return TEXTOS_SEM_VALOR.includes(texto.toLowerCase()) ? null : texto;
}
