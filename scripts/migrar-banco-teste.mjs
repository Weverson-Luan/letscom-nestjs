// pretest:e2e — aplica as migrations no banco de teste (docker-compose.test.yml).
// Os valores do .env.test SOBRESCREVEM o ambiente: um DATABASE_URL de dev exportado no shell
// (ou o do compose, dentro do letscom-api-dev) nunca é usado aqui.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseEnv } from 'node:util';

const raiz = resolve(import.meta.dirname, '..');
Object.assign(process.env, parseEnv(readFileSync(resolve(raiz, '.env.test'), 'utf8')));

// mesma trava do limparBanco: só migra banco terminado em _test
const url = process.env.DATABASE_URL ?? '';
if (!/\/[^/?]+_test(\?|$)/.test(url)) {
  console.error(`Recusado: DATABASE_URL não é um banco de teste (${url})`);
  process.exit(1);
}

const prisma = resolve(raiz, 'node_modules/prisma/build/index.js');
const { status } = spawnSync(process.execPath, [prisma, 'migrate', 'deploy'], { stdio: 'inherit', cwd: raiz });
process.exit(status ?? 1);
