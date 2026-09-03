import 'reflect-metadata';

const defaults: Record<string, string> = {
  APP_ENV: 'test',
  APP_PORT: '3000',
  APP_CONTEXT: 'apiparcelas',
  APP_URL: 'http://localhost:3000',
  FRONTEND_URL: 'http://localhost:8000',
  DATABASE_URL: 'mysql://letscom:letscom@localhost:3306/letscom_test',
  JWT_SECRET: 'letscom-jwt-secret-test-letscom-jwt-secret-test',
  JWT_ACCESS_TTL_DAYS: '7',
  JWT_REFRESH_TTL: '30',
  JWT_ALGORITHM: 'HS256',
  BCRYPT_ROUNDS: '4',
  REDIS_HOST: '127.0.0.1',
  REDIS_PORT: '6379',
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
