import { TransformFnParams } from 'class-transformer';

/** Remove espaços das pontas de textos (outros tipos seguem para o validador rejeitar). */
export function aparar({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

/** `@ValidateIf`: valida quando o campo veio (inclusive null); só ausente é ignorado. */
export function foiInformado(_objeto: object, valor: unknown): boolean {
  return valor !== undefined;
}

/**
 * Campo opcional vindo vazio (comum em multipart/form-data, onde tudo chega como texto)
 * é tratado como ausente. Lê o valor original (`obj[key]`) porque a conversão implícita
 * do ValidationPipe já transformou "" em 0/false antes do @Transform.
 */
export function vazioComoAusente({ value, obj, key }: TransformFnParams): unknown {
  return (obj as Record<string, unknown>)[key] === '' ? undefined : value;
}
