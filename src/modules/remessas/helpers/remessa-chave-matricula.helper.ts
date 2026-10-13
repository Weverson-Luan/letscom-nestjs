/**
 * Sanitização e comparação de chaves de matrícula/CPF entre planilha e ZIP —
 * espelha App\Helpers\RemessaChaveMatriculaHelper do Laravel.
 */

const INVISIVEIS = /[﻿​-‍⁠]/g;
const ESPACOS_UNICODE = /[   -   　]/g;

/** Remove BOM, zero-width e espaços Unicode invisíveis antes do trim padrão. */
export function sanitizarChaveMatricula(valor: string): string {
  return valor.replace(INVISIVEIS, '').replace(ESPACOS_UNICODE, '').trim();
}

/** Normaliza chave para comparação (alinhado ao front: lowercase, sem hífen/underscore). */
export function normalizarChaveParaComparacao(valor: string): string {
  return sanitizarChaveMatricula(valor).toLowerCase().replace(/[-_]/g, '');
}

/**
 * Resolve a chave canônica da planilha a partir de um valor externo (ex.: nome
 * do arquivo no ZIP). Retorna null quando não houver correspondência.
 */
export function resolverMatriculaNaPlanilha(
  dadosPlanilha: Record<string, unknown>,
  chaveExterna: string,
): string | null {
  const sanitizada = sanitizarChaveMatricula(chaveExterna);

  if (Object.prototype.hasOwnProperty.call(dadosPlanilha, sanitizada)) {
    return sanitizada;
  }

  const chaveNormalizada = normalizarChaveParaComparacao(chaveExterna);

  for (const matricula of Object.keys(dadosPlanilha)) {
    if (normalizarChaveParaComparacao(matricula) === chaveNormalizada) {
      return matricula;
    }
  }

  return null;
}
