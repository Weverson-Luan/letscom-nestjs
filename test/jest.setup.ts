import 'reflect-metadata';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseEnv } from 'node:util';

// banco e Redis de teste (docker-compose.test.yml) vêm do .env.test, versionado.
// SOBRESCREVE o ambiente: um DATABASE_URL/REDIS_* de dev exportado no shell nunca é usado nos testes.
Object.assign(process.env, parseEnv(readFileSync(resolve(__dirname, '../.env.test'), 'utf8')));

// demais variáveis obrigatórias: só preenchemos o que não estiver definido.
const defaults: Record<string, string> = {
  APP_PORT: '3000',
  APP_CONTEXT: 'apiparcelas',
  APP_URL: 'http://localhost:3000',
  FRONTEND_URL: 'http://localhost:8000',
  JWT_SECRET: 'letscom-jwt-secret-test-letscom-jwt-secret-test',
  JWT_ACCESS_TTL_DAYS: '7',
  JWT_REFRESH_TTL: '30',
  JWT_ALGORITHM: 'HS256',
  BCRYPT_ROUNDS: '4',
  FILESYSTEM_DISK: 'local',
  CLOUDFLARE_R2_ACCOUNT_ID: 'test-account',
  CLOUDFLARE_R2_ACCESS_KEY_ID: 'test-access-key',
  CLOUDFLARE_R2_SECRET_ACCESS_KEY: 'test-secret-key',
  CLOUDFLARE_R2_BUCKET: 'letscom-storage',
  CLOUDFLARE_R2_ENDPOINT: 'https://example.r2.cloudflarestorage.com',
  SIGNED_URL_EXPIRATION: '900',
  MAIL_FROM_ADDRESS: 'no-reply@letscom.test',
  MAIL_FROM_NAME: 'Letscom Crachas',
  MAILERSEND_API_KEY: 'ms_test_123',
  BLOQUEIO_LOGIN_CLIENTE_SUBORDINADO: 'true',
};

for (const [key, value] of Object.entries(defaults)) {
  process.env[key] ??= value;
}
