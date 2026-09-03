# Liberação de Remessas

## Overview

Módulo `remessa-liberacao` com dois controllers espelhando rotas Laravel: `liberar-remessa` (balcão) e `remessa-liberada-cliente` (recepção). Services separados para unitário e lote.

## Design

- REQ-001, REQ-002, REQ-003: `LiberarRemessaController` → `RemessaLiberadaBalcaoService` / `LiberarRemessasLoteBalcaoService`.
- REQ-004, REQ-005, REQ-006: `RemessaLiberadaClienteController` → `RemessaLiberadaClienteService` / `LiberarRemessasLoteClienteService`.
- REQ-007: `LoteValidacaoException` + helper `liberacao-remessa-mensagem.helper.ts`.
- REQ-008: `LiberacaoRemessaBalcaoEmailService` + templates em `shared/mail/templates/`.
- REQ-009: GET listagem e GET `:remessaId` em ambos controllers.

## Arquivos principais

```
src/modules/remessa-liberacao/
├── controllers/liberar-remessa.controller.ts
├── controllers/remessa-liberada-cliente.controller.ts
├── services/remessa-liberada-balcao.service.ts
├── services/remessa-liberada-cliente.service.ts
├── services/liberar-remessas-lote-balcao.service.ts
├── services/liberar-remessas-lote-cliente.service.ts
├── services/liberacao-remessa-balcao-email.service.ts
├── repositories/remessa-liberada-balcao.repository.ts
├── repositories/remessa-liberada-cliente.repository.ts
└── tests/                    # pendente
```

## Notes

- Liberação balcão unitária **não** altera status da remessa; lote **sim**.
- Liberação cliente em lote move status para `concluido`.
- Upload de comprovante (cliente) via `FileInterceptor` no controller.
