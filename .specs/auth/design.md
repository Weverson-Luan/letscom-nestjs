# Autenticação Letscom

## Overview

Módulo `auth` com use-cases (Clean Architecture), espelhando `AuthController` e `PasswordResetController` do Laravel. JWT HS256 para access; refresh opaco (32 bytes hex) persistido como hash SHA-256.

## Design

- REQ-001, REQ-002: `LoginUseCase` tenta `prisma.user.findFirst` → `prisma.userCliente.findFirst`; valida com `HashService.check`.
- REQ-003: Método privado `usuarioDesativado()` lança `HttpException` 422.
- REQ-004: Flag `auth.bloqueioLoginClienteSubordinado` via `ConfigService`; role via `RoleUserRepository`.
- REQ-005: `JwtTokenService.createToken` + `RefreshTokenService.issue`; resposta via `serializeUser` (remove senha).
- REQ-006: `RefreshTokenUseCase` → `RefreshTokenService.rotate` (revoga anterior + emite novo par).
- REQ-007: `LogoutUseCase` → `RefreshTokenService.revokeAll`.
- REQ-008: `ResetPasswordUseCase` + `PasswordResetService`; validação retorna `{ status: 200, body: { code: 422 } }`.
- REQ-009: `HashService` em `shared/utils/` — bcrypt + normalização `$2y$` → `$2b$` + fallback MD5.

## Arquivos principais

```
src/modules/auth/
├── controllers/auth.controller.ts
├── controllers/password-reset.controller.ts
├── use-cases/login.use-case.ts
├── use-cases/refresh-token.use-case.ts
├── use-cases/logout.use-case.ts
├── use-cases/reset-password.use-case.ts
├── services/jwt-token.service.ts
├── services/refresh-token.service.ts
├── repositories/refresh-token.repository.ts
└── tests/*.spec.ts
```

## Notes

- Guard global: `JwtAuthGuard` + `JwtStrategy` (shared/guards).
- Refresh throttled: `@Throttle({ default: { limit: 30, ttl: 60_000 } })`.
- BigInt de ids do Prisma é coercido para número no payload JWT.
