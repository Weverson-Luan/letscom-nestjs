# Solicitação de Remessas (Crachás)

## Overview

`SolicitarRemessaUseCase` valida entrada e delega execução ao `SolicitacaoRemessaService` (créditos, upload CSV/ZIP, persistência). Controller usa `FileFieldsInterceptor` para multipart.

## Design

- REQ-001, REQ-002: `RemessaController.solicitar` → `SolicitarRemessaUseCase.execute`.
- REQ-003 a REQ-005: Validação em `SolicitarRemessaUseCase.validate()` — espelha regras Laravel.
- REQ-006: Checagem estrutural pós-validação (ZIP exige CSV + campo_chave).
- REQ-007, REQ-008, REQ-009: Try/catch mapeia exceções para `{ status, body }`; controller seta `res.status(status)`.

## Arquivos principais

```
src/modules/remessas/
├── controllers/remessa.controller.ts
├── use-cases/solicitar-remessa.use-case.ts
├── services/solicitacao-remessa.service.ts
├── services/remessa.service.ts
├── dto/solicitar-remessa.dto.ts
└── tests/solicitar-remessa.use-case.spec.ts
```

## Fluxo de status da remessa

```
envio_de_dados → em_producao → conferido → pedido_liberado → concluido
```

## Notes

- Upload de fotos usa `StorageService` (local/R2).
- Planilha processada via `SpreadsheetService` (campo chave para cruzar fotos).
- Cache de listagem via `RemessasCacheService` (Redis version-key).
