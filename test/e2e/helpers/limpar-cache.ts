import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { INestApplication } from '@nestjs/common';
import { Cache } from 'cache-manager';

/** Porta do Redis de teste (docker-compose.test.yml, .env.test e serviço do CI). */
const PORTA_REDIS_TESTE = '6380';

/**
 * Esvazia o Redis de teste. Use junto com `limparBanco` nas suítes que leem listagens cacheadas:
 * o TRUNCATE reinicia os ids, então sem isso uma suíte recebe a resposta cacheada de outra
 * (mesmo cliente_id, dados diferentes).
 *
 * Trava de segurança: o `reset()` faz FLUSHDB, então só executa contra o Redis de teste
 * (porta 6380) e com o DATABASE_URL apontando para um banco terminado em `_test`.
 */
export async function limparCache(app: INestApplication): Promise<void> {
  const url = process.env.DATABASE_URL ?? '';
  const portaRedis = process.env.REDIS_PORT ?? '';
  if (!/\/[^/?]+_test(\?|$)/.test(url) || portaRedis !== PORTA_REDIS_TESTE) {
    throw new Error(
      `limparCache recusado: ambiente não é de teste (DATABASE_URL=${url}, REDIS_PORT=${portaRedis})`,
    );
  }

  await app.get<Cache>(CACHE_MANAGER).reset();
}
