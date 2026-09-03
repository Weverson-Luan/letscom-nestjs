# Dashboard Letscom

## Overview

Módulo `dashboard` com service fino que delega agregações ao `DashboardRepository` e listagem de logs ao `ActivityLogRepository`. Adaptação do padrão SDD do kinder-backend (`clinic-dashboard`) para métricas de remessas/crachás.

## Design

- REQ-001, REQ-002: `DashboardController` com `@Roles(Role.ADMIN, Role.PRODUCAO, Role.CONSULTOR)` no overview.
- REQ-003, REQ-004, REQ-005: `DashboardRepository` — contagens via Prisma (`userCliente`, `remessaFoto`, `remessa`) e `$queryRaw` para lotes de fotos.
- REQ-006: `DashboardService.listarAtividades` → `ActivityLogRepository.listar` + `mapActivityLog`.
- REQ-007: Sem migrations; apenas leitura agregada.

## Arquivos principais

```
src/modules/dashboard/
├── controllers/dashboard.controller.ts
├── services/dashboard.service.ts
├── repositories/dashboard.repository.ts
├── repositories/activity-log.repository.ts
├── mappers/activity-log.mapper.ts
└── tests/dashboard.service.spec.ts
```

## Notes

- Diferente do kinder: não há contexto multi-clínica (`X-Clinic-Id`); escopo é global da Letscom.
- Tipos de atividade: `remessa_criada`, `status_alterado`, `fotos_enviadas`, `cliente_cadastrado`.
