# Traceability

| Requirement | Design | Tasks | Testes | Status |
|---|---|---|---|---|
| REQ-001 | DashboardController.overview | TASK-001, TASK-004 | dashboard.service.spec.ts | implemented |
| REQ-002 | @Roles no controller | TASK-001 | — | implemented |
| REQ-003 | DashboardRepository KPIs | TASK-002 | dashboard.service.spec.ts | implemented |
| REQ-004 | calcularTaxaSucesso() | TASK-002 | dashboard.service.spec.ts | implemented |
| REQ-005 | listarAtividadesRecentes() | TASK-002 | dashboard.service.spec.ts | implemented |
| REQ-006 | listarAtividades + mapper | TASK-003 | dashboard.service.spec.ts | implemented |
| REQ-007 | Sem mudanças de schema | TASK-004 | — | implemented |

| Acceptance Criteria | Teste |
|---|---|
| AC-001 | dashboard.service.spec.ts — agrega métricas |
| AC-003 | dashboard.service.spec.ts — zeros sem dados |
| AC-004 | dashboard.service.spec.ts — listarAtividades |
