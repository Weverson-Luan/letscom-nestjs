# Spec-Driven Development (SDD) — Letscom Crachás

Esta pasta contém especificações para orientar implementação e revisão por IA (Cursor, Claude, etc.).

## Estrutura por feature

```
.specs/<feature>/
├── requirements.md    # Requisitos e critérios de aceite (REQ-xxx, AC-xxx)
├── design.md          # Decisões técnicas e mapeamento REQ → código
├── tasks.md           # Checklist de implementação (TASK-xxx)
└── traceability.md    # Matriz REQ ↔ Design ↔ Tasks ↔ Testes
```

## Fluxo de trabalho para IA

1. **Ler** `requirements.md` da feature antes de codar.
2. **Consultar** `design.md` para saber onde implementar (módulo, use-case, service).
3. **Executar** as tasks pendentes em `tasks.md`.
4. **Criar/atualizar** testes em `src/**/tests/*.spec.ts` cobrindo os ACs.
5. **Atualizar** `traceability.md` e marcar tasks concluídas.

## Convenções Letscom

| Kinder-backend | Letscom-nestjs |
|---|---|
| Cookie session + opaque token | JWT access + refresh opaco (SHA-256) |
| `X-Clinic-Id` + roles de clínica | `@Roles()` + `AuthUser.tipoLogin` (user/subordinado) |
| PostgreSQL + Prisma adapter pg | MySQL/MariaDB + Prisma |
| Prefixo `/api` | Prefixo global `APP_CONTEXT` (ex.: `/apiparcelas`) |
| Resposta REST direta | `{ code, status, message, data, pagination }` |

## Features documentadas

| Feature | Pasta | Status |
|---|---|---|
| Autenticação | [auth](./auth/) | implementado |
| Dashboard | [dashboard](./dashboard/) | implementado |
| Solicitação de remessas (crachás) | [remessas](./remessas/) | implementado |
| Liberação de remessas | [remessa-liberacao](./remessa-liberacao/) | implementado (specs de teste pendentes) |

## Testes unitários

Specs Jest ficam em `src/**/tests/*.spec.ts` (padrão clonado do kinder-backend).

```bash
npm test                              # todos
npm test -- src/modules/auth/tests    # por módulo
```

Setup de env de teste: `test/jest.setup.ts`.
