/**
 * IMPORTS
 */

/**
 * Formatação de CEP
 * @example
 * formatarCep('12345678') // '12345-678'
 * formatarCep('123456789') // '123456789'
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