import { TransformFnParams } from 'class-transformer';

/** Remove espaços das pontas de textos (outros tipos seguem para o validador rejeitar). */
export function aparar({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

/** `@ValidateIf`: valida quando o campo veio (inclusive null); só ausente é ignorado. */
export function foiInformado(_objeto: object, valor: unknown): boolean {
  return valor !== undefined;
}
