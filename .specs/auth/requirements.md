# Autenticação Letscom

## Context

O sistema de crachás possui dois tipos de login: **usuário interno** (`users`) e **subordinado** (`users_cliente`). A autenticação usa JWT (access) + refresh token opaco com rotação, espelhando o Laravel original.

## Requirements

- REQ-001: O backend deve expor `POST /login` (público) com `email` e `senha`.
- REQ-002: O login deve tentar autenticar primeiro como `User` interno e, se falhar, como `UserCliente` subordinado.
- REQ-003: Usuários desativados (`ativo = false`) devem receber HTTP 422 com mensagem de conta desativada.
- REQ-004: Quando `BLOQUEIO_LOGIN_CLIENTE_SUBORDINADO=true`, login de role `cliente` (interno) e de subordinados deve retornar HTTP 422 com mensagem de instabilidade.
- REQ-005: Login bem-sucedido deve retornar `access_token`, `refresh_token` e dados do usuário (sem senha).
- REQ-006: O backend deve expor `POST /auth/refresh` (público, throttled) para rotação de refresh token.
- REQ-007: O backend deve expor `POST /auth/logout` (autenticado) revogando todos os refresh tokens do usuário.
- REQ-008: Reset de senha deve manter contrato Laravel: HTTP 200 com `code` no corpo (422 em validação).
- REQ-009: Senhas devem ser verificadas com bcrypt; hashes legados PHP (`$2y$`) e MD5 devem ser suportados.

## Acceptance Criteria

- AC-001: Dado credenciais inválidas, quando chamar `POST /login`, então retorna HTTP 401.
- AC-002: Dado usuário interno ativo com senha correta, quando chamar `POST /login`, então retorna tokens e `tipo_login: user`.
- AC-003: Dado subordinado ativo com bloqueio desligado, quando chamar `POST /login`, então retorna tokens e `tipo_login: subordinado` com `cliente_principal`.
- AC-004: Dado refresh token inválido, quando chamar `POST /auth/refresh`, então retorna HTTP 401.
- AC-005: Dado refresh token válido, quando chamar `POST /auth/refresh`, então retorna novo par access/refresh (rotação).
- AC-006: Dado usuário autenticado, quando chamar `POST /auth/logout`, então revoga refresh tokens e retorna sucesso.
- AC-007: Dado token de reset expirado, quando chamar reset, então retorna HTTP 200 com `code: 422`.
