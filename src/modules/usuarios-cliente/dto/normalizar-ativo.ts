/** Converte 0/1, "0"/"1" e boolean para boolean (compatível com o front Laravel). */
export function normalizarAtivo(value: unknown): unknown {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1' || value === 1) return true;
  if (value === 'false' || value === '0' || value === 0) return false;
  return value;
}
