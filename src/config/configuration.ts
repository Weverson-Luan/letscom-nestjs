/**
 * Configuração tipada da aplicação (equivalente aos arquivos config/*.php do Laravel).
 * Acessível via ConfigService.get('...').
 */
export default () => ({
  app: {
    env: process.env.APP_ENV ?? 'development',
    port: parseInt(process.env.APP_PORT ?? '3000', 10),
    context: process.env.APP_CONTEXT ?? 'apiparcelas',
    url: process.env.APP_URL ?? 'http://localhost:3000',
    frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:8000',
    timezone: process.env.APP_TIMEZONE ?? 'America/Sao_Paulo',
    maxUploadSize: parseInt(process.env.MAX_UPLOAD_SIZE ?? '209715200', 10),
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    accessTtlDays: parseInt(process.env.JWT_ACCESS_TTL_DAYS ?? '7', 10),
    refreshTtlDays: parseInt(process.env.JWT_REFRESH_TTL ?? '30', 10),
    algorithm: process.env.JWT_ALGORITHM ?? 'HS256',
  },
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS ?? '12', 10),
  },
  redis: {
    host: process.env.REDIS_HOST ?? '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  remessas: {
    cacheTtl: parseInt(process.env.REMESSAS_CACHE_TTL ?? '60', 10),
  },
  storage: {
    disk: process.env.FILESYSTEM_DISK ?? 'local',
    signedUrlExpiration: parseInt(process.env.SIGNED_URL_EXPIRATION ?? '900', 10),
    r2: {
      accountId: process.env.CLOUDFLARE_R2_ACCOUNT_ID,
      accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
      bucket: process.env.CLOUDFLARE_R2_BUCKET,
      endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
    },
  },
  mail: {
    fromAddress: process.env.MAIL_FROM_ADDRESS,
    fromName: process.env.MAIL_FROM_NAME,
    mailersendApiKey: process.env.MAILERSEND_API_KEY,
    mailersendTimeout: parseInt(process.env.MAILERSEND_TIMEOUT ?? '30', 10),
  },
  business: {
    senhaUsuarioSubordinadoDefault:
      process.env.SENHA_USUARIO_SUBORDINADO_LETSCOM_DEFAULT,
    userIdExecutorAdmin: process.env.USER_ID_EXECUTOR_ADMIN,
  },
  auth: {
    bloqueioLoginClienteSubordinado:
      process.env.BLOQUEIO_LOGIN_CLIENTE_SUBORDINADO === 'true',
    mensagemInstabilidade:
      process.env.AUTH_MENSAGEM_INSTABILIDADE ??
      'Estamos enfrentando uma instabilidade temporária em nosso sistema. Nossa equipe já está trabalhando para normalizar o funcionamento o mais breve possível. Pedimos desculpas pelo transtorno e agradecemos a compreensão.',
  },
  tutorials: {
    videoPath:
      process.env.TUTORIAL_VIDEO_PATH ??
      'videos-tutorias/video-tutotial-pequeno.mp4',
  },
  log: {
    level: process.env.LOG_LEVEL ?? 'debug',
  },
});
