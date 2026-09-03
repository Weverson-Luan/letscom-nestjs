# Traceability

| Requirement | Design | Tasks | Testes | Status |
|---|---|---|---|---|
| REQ-001 | AuthController.login | TASK-001, TASK-002 | auth.controller.spec.ts, login.use-case.spec.ts | implemented |
| REQ-002 | LoginUseCase dual auth | TASK-002 | login.use-case.spec.ts | implemented |
| REQ-003 | usuarioDesativado() | TASK-002 | login.use-case.spec.ts | implemented |
| REQ-004 | ConfigService bloqueio | TASK-002 | login.use-case.spec.ts | implemented |
| REQ-005 | JwtToken + RefreshToken | TASK-002 | jwt-token.service.spec.ts, login.use-case.spec.ts | implemented |
| REQ-006 | RefreshTokenUseCase.rotate | TASK-003 | refresh-token.use-case.spec.ts, auth.controller.spec.ts | implemented |
| REQ-007 | LogoutUseCase.revokeAll | TASK-004 | logout.use-case.spec.ts, auth.controller.spec.ts | implemented |
| REQ-008 | ResetPasswordUseCase | TASK-005 | reset-password.use-case.spec.ts | implemented |
| REQ-009 | HashService | TASK-006 | hash.service.spec.ts | implemented |

| Acceptance Criteria | Teste |
|---|---|
| AC-001 | login.use-case.spec.ts — credenciais inválidas |
| AC-002 | login.use-case.spec.ts — usuário interno |
| AC-003 | login.use-case.spec.ts — subordinado |
| AC-004 | refresh-token.use-case.spec.ts — token inválido |
| AC-005 | refresh-token.use-case.spec.ts — rotação OK |
| AC-006 | logout.use-case.spec.ts — revokeAll |
| AC-007 | reset-password.use-case.spec.ts — BusinessException |
