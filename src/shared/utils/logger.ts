import { utilities as nestWinstonUtilities } from 'nest-winston';
import * as winston from 'winston';

/**
 * Configuração do Winston (equivalente ao canal `stack` do Monolog no Laravel):
 * console colorido em dev + arquivos rotativos para erros e log geral.
 */
export function createWinstonOptions(level = 'debug'): winston.LoggerOptions {
  return {
    level,
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          nestWinstonUtilities.format.nestLike('Letscom', {
            colors: true,
            prettyPrint: true,
          }),
        ),
      }),
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
        ),
      }),
      new winston.transports.File({
        filename: 'logs/app.log',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
        ),
      }),
    ],
  };
}

/** Campos sensíveis que nunca devem ser logados (espelha o LogRequestMiddleware). */
export const SENSITIVE_FIELDS = [
  'senha',
  'password',
  'password_confirmation',
  'token',
  'access_token',
  'refresh_token',
  'authorization',
];

export function sanitizePayload(
  payload: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!payload) return {};
  const clone: Record<string, unknown> = { ...payload };
  for (const field of SENSITIVE_FIELDS) {
    if (field in clone) clone[field] = '***';
  }
  return clone;
}
