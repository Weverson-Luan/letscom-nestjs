/**
 * Equivalente ao filter_var($valor, FILTER_VALIDATE_BOOLEAN) do PHP:
 * '1', 'true', 'on' e 'yes' viram true; qualquer outro valor vira false.
 */
export function filterVarBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  return ['1', 'true', 'on', 'yes'].includes(
    String(value ?? '')
      .trim()
      .toLowerCase(),
  );
}

/**
 * Filtro opcional de listagem (`?ativo=`): ausente, null ou vazio não filtra,
 * espelhando `array_key_exists('ativo', $params) && $params['ativo'] !== null && $params['ativo'] !== ''`.
 */
export function optionalBooleanFilter(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  return filterVarBoolean(value);
}

/**
 * Normaliza booleanos de payload (regra `boolean` do Laravel: true/false, 1/0,
 * '1'/'0', 'true'/'false'); outros valores seguem para o @IsBoolean rejeitar.
 */
export function normalizarBooleano(value: unknown): unknown {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1' || value === 1) return true;
  if (value === 'false' || value === '0' || value === 0) return false;
  return value;
}
