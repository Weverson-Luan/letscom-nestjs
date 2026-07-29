import { plainToInstance, Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  validateSync,
} from 'class-validator';

export enum NodeEnv {
  development = 'development',
  production = 'production',
  test = 'test',
}

/**
 * Validação das variáveis de ambiente na inicialização (equivalente à
 * checagem de config do Laravel). Falha cedo se algo obrigatório faltar.
 */
export class EnvironmentVariables {
  @IsOptional()
  @IsEnum(NodeEnv)
  APP_ENV: NodeEnv = NodeEnv.development;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  APP_PORT = 3000;

  @IsString()
  APP_CONTEXT: string;

  @IsOptional()
  @IsString()
  APP_URL: string;

  @IsOptional()
  @IsString()
  FRONTEND_URL: string;

  @IsString()
  DATABASE_URL: string;

  @IsString()
  JWT_SECRET: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  JWT_ACCESS_TTL_DAYS = 7;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  JWT_REFRESH_TTL = 30;

  @IsOptional()
  @IsString()
  JWT_ALGORITHM = 'HS256';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  BCRYPT_ROUNDS = 12;

  @IsOptional()
  @IsString()
  REDIS_HOST = '127.0.0.1';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  REDIS_PORT = 6379;

  @IsOptional()
  @IsString()
  REDIS_PASSWORD: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  REMESSAS_CACHE_TTL = 60;

  @IsOptional()
  @IsString()
  FILESYSTEM_DISK = 'local';

  @IsOptional()
  @IsString()
  CLOUDFLARE_R2_ACCOUNT_ID: string;

  @IsOptional()
  @IsString()
  CLOUDFLARE_R2_ACCESS_KEY_ID: string;

  @IsOptional()
  @IsString()
  CLOUDFLARE_R2_SECRET_ACCESS_KEY: string;

  @IsOptional()
  @IsString()
  CLOUDFLARE_R2_BUCKET: string;

  @IsOptional()
  @IsString()
  CLOUDFLARE_R2_ENDPOINT: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  SIGNED_URL_EXPIRATION = 900;

  @IsOptional()
  @IsString()
  MAIL_FROM_ADDRESS: string;

  @IsOptional()
  @IsString()
  MAIL_FROM_NAME: string;

  @IsOptional()
  @IsString()
  MAILERSEND_API_KEY: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  MAILERSEND_TIMEOUT = 30;

  @IsOptional()
  @IsString()
  SENHA_USUARIO_SUBORDINADO_LETSCOM_DEFAULT: string;

  @IsOptional()
  @IsString()
  USER_ID_EXECUTOR_ADMIN: string;

  @IsOptional()
  @IsString()
  LOG_LEVEL = 'debug';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  MAX_UPLOAD_SIZE = 209715200;
}

export function validateEnv(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(
      `Erro de validação das variáveis de ambiente:\n${errors
        .map((e) => Object.values(e.constraints ?? {}).join(', '))
        .join('\n')}`,
    );
  }

  return validated;
}
