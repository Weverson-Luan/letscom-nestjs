/**
 * IMPORTS
 */

function formatarCep(cep: string): string {
  const digits = (cep ?? '').replace(/\D/g, '');

  if (digits.length === 8) {
    return `${digits.slice(0, 5)}-${digits.slice(5, 8)}`;
  }

  return cep;
}

/**
 * EXPORTS
 */
export { formatarCep };