# Traceability

| Requirement | Design | Tasks | Testes | Status |
|---|---|---|---|---|
| REQ-001 | RemessaController.solicitar | TASK-001 | solicitar-remessa.use-case.spec.ts | implemented |
| REQ-002 | @Roles cliente/admin/subordinado | TASK-001 | — | implemented |
| REQ-003 | validate() campos obrigatórios | TASK-002 | solicitar-remessa.use-case.spec.ts | implemented |
| REQ-004 | validate() status | TASK-002 | solicitar-remessa.use-case.spec.ts | implemented |
| REQ-005 | validate() posição | TASK-002 | solicitar-remessa.use-case.spec.ts | implemented |
| REQ-006 | checagem ZIP/CSV/campo_chave | TASK-003 | solicitar-remessa.use-case.spec.ts | implemented |
| REQ-007 | retorno 422 errors | TASK-002 | solicitar-remessa.use-case.spec.ts | implemented |
| REQ-008 | executar → 201 | TASK-004 | solicitar-remessa.use-case.spec.ts | implemented |
| REQ-009 | BusinessException → 422 | TASK-004 | solicitar-remessa.use-case.spec.ts | implemented |

| Acceptance Criteria | Teste |
|---|---|
| AC-001 | solicitar-remessa.use-case.spec.ts — campos ausentes |
| AC-002 | solicitar-remessa.use-case.spec.ts — status inválido |
| AC-003 | solicitar-remessa.use-case.spec.ts — ZIP sem planilha |
| AC-004 | solicitar-remessa.use-case.spec.ts — sucesso 201 |
| AC-005 | solicitar-remessa.use-case.spec.ts — BusinessException |
