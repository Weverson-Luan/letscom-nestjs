# letscom-api

Migração NestJS do backend Laravel 11 (gestão de créditos e remessas). NestJS 10 + Prisma (MySQL) + Redis.

Arquitetura, regras de camada e estratégia de testes: **[docs/arquitetura.md](docs/arquitetura.md)** — siga sempre.
Como rodar testes (unit e e2e): **[docs/testes.md](docs/testes.md)**. Teste de carga (k6): **[docs/teste-de-carga.md](docs/teste-de-carga.md)** — o dev executa (gera carga real na API).
Padrões de revisão: subagente `tech-lead` em `.claude/agents/tech-lead.md` — rode-o antes de encerrar qualquer alteração de código.

## Regras inegociáveis

1. **Nunca executar migration nem alterar o banco.** Não rode `prisma migrate *`, `prisma db *`,
   `npm run prisma:migrate|prisma:seed`, nem `docker restart` / `docker compose up` / `npm run docker:*` / `npm run test:e2e`
   (o container e o `test:e2e` aplicam `migrate deploy`; o `test:e2e` também sobe containers). Escreva o `schema.prisma` e o
   `prisma/migrations/<timestamp>_<nome>/migration.sql` e **devolva ao dev o SQL e os comandos** para
   ele executar no terminal (formato em `docs/arquitetura.md` → "Banco e migrations").
2. **Todo código novo ou alterado vem com testes**: unitário em `src/modules/<modulo>/tests/*.spec.ts`
   e, para endpoint novo/alterado, e2e em `test/e2e/<modulo>/*.e2e-spec.ts`.
3. **Uma funcionalidade por arquivo em controller, service e repository** (referência: `src/modules/users`):
   `<acao>-<recurso>.controller.ts` (um endpoint), `<acao>-<recurso>.service.ts` (um único `execute(...)`)
   e `<acao>-<recurso>.repository.ts` (só as queries da funcionalidade). Funcionalidade nova = arquivos novos,
   nunca método/endpoint novo em arquivo existente.
4. **Nomes em português** (verbos inclusive, sem acento), **sem abreviação** (`transacao`, não `tx`; `conexao`, não `db`). Legado em inglês é migrado aos poucos —
   não renomear em massa.

## Comandos

```bash
npm test                 # unitários
npm run test:e2e         # DEV executa: sobe banco/Redis de teste, migra, testa e para os containers (IA não roda)
npm run lint
npm run typecheck
npx prisma generate      # permitido: só gera o client
```
