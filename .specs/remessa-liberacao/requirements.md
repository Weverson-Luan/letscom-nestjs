# Liberação de Remessas

## Context

Após produção dos crachás, remessas passam por dois fluxos de liberação: **balcão** (expedição entrega ao cliente) e **cliente** (recepção confirma entrega). Ambos suportam liberação unitária e em lote, com envio de e-mail e atualização de status.

## Requirements

- REQ-001: O backend deve expor `POST /liberar-remessa` para liberação unitária no balcão.
- REQ-002: O backend deve expor `POST /liberar-remessa/lote` para liberação em lote no balcão (atualiza status da remessa).
- REQ-003: Roles balcão: `admin`, `producao`, `consultor`, `expedicao`.
- REQ-004: O backend deve expor `POST /remessa-liberada-cliente` para liberação unitária ao cliente.
- REQ-005: O backend deve expor `POST /remessa-liberada-cliente/lote` para liberação em lote (status → `concluido`).
- REQ-006: Roles cliente: leitura `admin`, `producao`, `recepcao`; update `admin`, `producao`.
- REQ-007: Liberação em lote deve validar remessas elegíveis e retornar erros por item inválido (`LoteValidacaoException`).
- REQ-008: Liberação deve disparar e-mail via `LiberacaoRemessaBalcaoEmailService` / templates MailerSend.
- REQ-009: Endpoints de listagem e consulta por `remessa_id` devem estar disponíveis para ambos fluxos.

## Acceptance Criteria

- AC-001: Dado remessa elegível, quando liberar no balcão, então retorna 201 com registro de liberação.
- AC-002: Dado lote com remessa inválida, quando liberar em lote, então retorna erro de validação sem liberar itens inválidos.
- AC-003: Dado liberação cliente em lote, quando concluir, então status da remessa vira `concluido`.
- AC-004: Dado usuário sem role permitida, quando tentar liberar, então retorna 403.
