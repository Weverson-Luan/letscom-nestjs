# Dashboard Letscom

## Context

A tela inicial do sistema de crachás precisa carregar KPIs operacionais (clientes, fotos processadas, taxa de sucesso) e uma lista curta de atividades recentes em uma única request. Admins também consultam logs de auditoria paginados.

## Requirements

- REQ-001: O backend deve expor `GET /dashboard/overview` com `Authorization: Bearer`.
- REQ-002: Overview deve aceitar roles `admin`, `producao` e `consultor`.
- REQ-003: A resposta overview deve incluir `clientes_ativos`, `usuarios_cliente_ativos`, `fotos_processadas`, `taxa_sucesso` e `remessas_canceladas` (atividades recentes saíram do overview — ver REQ-005).
- REQ-004: `taxa_sucesso` deve ser `(concluidas / (concluidas + canceladas)) * 100`, arredondada 1 casa decimal; zero quando não há remessas.
- REQ-005: Atividades recentes devem agregar eventos de remessas criadas, mudanças de status, lotes de fotos e novos clientes, ordenados por data desc, expostas em `GET /dashboard/atividades-recentes?page=1&per_page=10` (per_page máx. 50; inválidos → 400) com paginação no banco (UNION ALL + LIMIT/OFFSET).
- REQ-006: O backend deve expor `GET /dashboard/atividades` (somente `admin`) com paginação de activity logs.
- REQ-007: O endpoint não deve alterar schemas. Exceção acordada: `atividades_recentes` saiu do overview (único consumidor, o backoffice, passa a usar `GET /dashboard/atividades-recentes`).

## Acceptance Criteria

- AC-001: Dado usuário autorizado, quando chamar `GET /dashboard/overview`, então retorna os KPIs (as atividades recentes vêm de `GET /dashboard/atividades-recentes`, paginadas).
- AC-002: Dado usuário sem role permitida, quando chamar overview, então retorna 403.
- AC-003: Dado sistema sem dados, quando chamar overview, então retorna contadores zerados (e `GET /dashboard/atividades-recentes` retorna `data: []` com `total: 0`).
- AC-004: Dado admin autenticado, quando chamar `GET /dashboard/atividades`, então retorna logs mapeados com paginação.
