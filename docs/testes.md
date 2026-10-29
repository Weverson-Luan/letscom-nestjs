# Testes — passo a passo

Guia para quem está chegando no projeto rodar os testes unitários e e2e sem precisar de ajuda.
Regras sobre **o que** testar estão em [arquitetura.md](arquitetura.md#testes--integridade-obrigatória).
Teste de carga (k6): [teste-de-carga.md](teste-de-carga.md).

## Resumo rápido

```bash
npm install                 # uma vez
npm test                    # unitários (não precisam de Docker)
npm run test:e2e            # sobe letscom-bd-test + letscom-redis-test, migra, roda os e2e e para os containers
npm run test:e2e -- test/e2e/uploads

```

## Pré-requisitos

| Ferramenta | Versão | Para quê |
|---|---|---|
| Node.js | a mesma do `Dockerfile` (20.6+ por causa do `--env-file`) | rodar Jest e Prisma no host |
| Docker Desktop (ou Docker Engine) | com `docker compose` v2 | banco e Redis dos testes e2e |
| Portas livres | `3308` (MySQL) e `6380` (Redis) | ambiente de teste |

O ambiente de teste é o `docker-compose.test.yml`: compose próprio, separado do de dev, mas com o mesmo nome
de projeto (`letscom-dev`), então aparece no mesmo grupo do Docker Desktop. As variáveis de banco e Redis dos
testes ficam no `.env.test` (versionado, credenciais fixas de teste), carregado pelo `test/jest.setup.ts` e
pelo `dotenv -o -e .env.test` dos scripts `pretest:e2e`/`test:e2e`, sempre **sobrescrevendo** o ambiente: nem o `.env` de dev nem um `DATABASE_URL` exportado no
shell são usados para banco e Redis.

O aviso `Found orphan containers` no `docker:up`/`test:e2e` é esperado (os dois composes dividem o projeto).
**Não** use `--remove-orphans`: ele derrubaria os containers do outro compose.

---

## 1. Testes unitários

Isolados, com todas as dependências mockadas. Não precisam de banco, Redis nem Docker.

```bash
npm test                                         # todos
npm test -- src/modules/auth                     # uma pasta
npm test -- src/modules/auth/tests/jwt-token     # um arquivo (casa por trecho do caminho)
npm test -- -t "lança erro quando"               # só os testes cujo nome contém o trecho
npm run test:watch                               # modo watch enquanto desenvolve
npx jest --coverage                              # cobertura em ./coverage
```

Onde ficam: `src/modules/<modulo>/tests/*.spec.ts` (e `src/shared/**/tests/*.spec.ts`).

---

## 2. Testes e2e (ponta a ponta)

Sobem a aplicação inteira (`AppModule`) no host e fazem requisições HTTP reais (supertest) contra o
banco `letscom_test` do `letscom-bd-test` e o Redis do `letscom-redis-test`.

### Como rodar

```bash
npm run test:e2e                                  # todos
npm run test:e2e -- test/e2e/health               # só uma pasta ou arquivo
npm run test:e2e -- -t "responde 200"             # só testes cujo nome contém o trecho
```

Não precisa subir nada antes: fora dos testes, `letscom-bd-test` e `letscom-redis-test` ficam parados.

O que acontece no `npm run test:e2e` (scripts `pretest:e2e` → `test:e2e` → `posttest:e2e` do `package.json`):

1. `pretest:e2e`: `npm run docker:up:test:dev` sobe banco e Redis de teste e espera ficarem healthy;
   depois `dotenv -o -e .env.test -- prisma migrate deploy` migra o `letscom_test`;
2. `globalSetup` ([`test/e2e/limpar-ambiente-e2e.ts`](../test/e2e/limpar-ambiente-e2e.ts)): `TRUNCATE` em
   todas as tabelas (mantém estrutura e `_prisma_migrations`) e `FLUSHDB` no Redis de teste;
3. jest e2e com `--runInBand`;
4. `globalTeardown`: a mesma limpeza do passo 2;
5. `posttest:e2e`: `npm run docker:stop:test:stop` para os containers.

O `posttest:e2e` só roda se **todos os testes passarem**. Com falha (ou Ctrl+C), os containers ficam no ar.
Isso permite inspecionar o banco; depois, pare na mão com `npm run docker:stop:test:stop`.

O banco de teste usa `tmpfs`: ao parar, os dados somem, e o passo 1 recria as tabelas na próxima rodada.

Isolamento: banco e Redis de teste são containers próprios; o `letscom-bd-dev` e o `letscom-redis-dev`
nunca são tocados. O `limparBanco` só aceita bancos terminados em `_test`. Dentro da suíte, use
`limparBanco` no `beforeEach` para isolar um teste do outro.

Inspecionar: conecte em `mysql://letscom:letscom@127.0.0.1:3308/letscom_test` (DBeaver, TablePlus ou
`npx dotenv -o -e .env.test -- prisma studio`). Para ver o estado de uma falha, comente o `globalTeardown`
em `test/jest-e2e.json` localmente: como o teste falhou, os containers continuam no ar com os dados.

---

## 3. Escrevendo um teste e2e

Arquivo em `test/e2e/<modulo>/<acao>-<recurso>.e2e-spec.ts`, **um por endpoint** (regra em
[arquitetura.md](arquitetura.md) → "E2E"; módulo de referência: `test/e2e/usuarios-cliente/`). Exemplo real:
[`test/e2e/health/testar-conexao.e2e-spec.ts`](../test/e2e/health/testar-conexao.e2e-spec.ts).

```ts
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { MailService } from 'src/shared/mail/mail.service';
import { criarAppE2e, PREFIXO_API } from '../helpers/criar-app-e2e';
import { limparBanco } from '../helpers/limpar-banco';

describe('POST /remessas (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    // serviços externos (e-mail, storage) sempre mockados no e2e
    app = await criarAppE2e((b) => b.overrideProvider(MailService).useValue({ send: jest.fn(), render: jest.fn() }));
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await limparBanco(prisma); // cada teste começa do zero
  });

  afterAll(async () => {
    await app?.close();
  });

  it('responde 401 sem token', async () => {
    const resposta = await request(app.getHttpServer()).post(`${PREFIXO_API}/remessas`).send({});
    expect(resposta.status).toBe(401);
  });

  // 403 sem papel/feature, 400 com DTO inválido, 2xx + formato da resposta + efeito no banco...
});
```

Helpers disponíveis em `test/e2e/helpers/`:

| Helper | Para quê |
|---|---|
| `criarAppE2e(customizar?)` | sobe a app com a mesma configuração do `main.ts` (prefixo, `ValidationPipe`, filtro de erros, BigInt). `customizar` permite `overrideProvider` |
| `PREFIXO_API` | prefixo das rotas (`/apiparcelas`) |
| `limparBanco(prisma)` | `TRUNCATE` em todas as tabelas (exceto `_prisma_migrations`). Só roda se o `DATABASE_URL` terminar em `_test` |

Checklist mínimo por endpoint: **401** sem token · **403** sem papel/feature · **400** com DTO
inválido · **2xx** validando o formato da resposta · **efeito persistido** no banco.

---

## 4. Problemas comuns

| Sintoma | Causa / solução |
|---|---|
| `ECONNREFUSED 127.0.0.1:3308` ou `:6380` | rodou o jest direto, sem o `npm run test:e2e`, que é quem sobe o ambiente |
| `port is already allocated` no `test:e2e` | porta `3308` ou `6380` em uso por outro serviço. Libere a porta ou ajuste `docker-compose.test.yml` e `.env.test` juntos |
| `Cannot find module` / `Could not find a declaration file` | dependência nova no `package.json`. Rode `npm install` |
| `The table ... does not exist` | migrations não aplicadas. Veja a saída do `prisma migrate deploy` no `pretest:e2e` |
| `limparBanco recusado` | o `DATABASE_URL` não aponta para um banco `_test`, ou seja, a trava evitou apagar outro banco |
| `Cannot connect to the Docker daemon` | Docker Desktop desligado |
| Teste passa sozinho e falha junto com os outros | dados vazando entre testes. Use `limparBanco` no `beforeEach` e não dependa da ordem |

---

## 5. Regra para IA (Claude / Cursor)

`npm run test:e2e` sobe containers e aplica migrations, **então quem executa é o dev**.
A IA roda `npm test` e, para o e2e, devolve os comandos para o dev executar. Bloqueio configurado em
`.claude/settings.json`.
