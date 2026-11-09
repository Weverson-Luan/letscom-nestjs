import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { INestApplication } from '@nestjs/common';
import { Cache } from 'cache-manager';

/**
 * Esvazia o Redis de teste. Use junto com `limparBanco` nas suítes que leem listagens cacheadas:
 * o TRUNCATE reinicia os ids, então sem isso uma suíte recebe a resposta cacheada de outra
 * (mesmo cliente_id, dados diferentes).
 *
 * Trava de segurança: só executa se o DATABASE_URL apontar para um banco terminado em `_test`
 * (o mesmo .env.test que define o Redis de teste).
 */
export async function limparCache(app: INestApplication): Promise<void> {
  const url = process.env.DATABASE_URL ?? '';
  if (!/\/[^/?]+_test(\?|$)/.test(url)) {
    throw new Error(`limparCache recusado: DATABASE_URL não é um banco de teste (${url})`);
  }

  await app.get<Cache>(CACHE_MANAGER).reset();
}
