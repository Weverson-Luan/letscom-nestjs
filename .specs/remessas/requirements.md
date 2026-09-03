# Solicitação de Remessas (Crachás)

## Context

Clientes e subordinados solicitam remessas de crachás informando modelo técnico, tecnologia, produto e quantidade. Podem enviar planilha CSV e/ou ZIP de fotos para produção. Este é o fluxo central do sistema Letscom.

## Requirements

- REQ-001: O backend deve expor `POST /remessas` (multipart) para solicitar remessa.
- REQ-002: Roles permitidas: `cliente`, `admin`, `subordinado`.
- REQ-003: Campos obrigatórios: `cliente_id`, solicitante (user ou subordinado), `modelo_tecnico_id`, `tecnologia_id`, `total_solicitacoes`, `situacao`, `status`, `posicao`, `produto_id`, `nome`, `documento`.
- REQ-004: `status` deve ser um valor válido do fluxo: `envio_de_dados`, `em_producao`, `conferido`, `pedido_liberado`, `concluido`.
- REQ-005: `posicao` deve ser `h`, `H`, `v` ou `V` (horizontal/vertical do crachá).
- REQ-006: Se `zip_file` for enviado, `csv_file` e `campo_chave` são obrigatórios.
- REQ-007: Validação falha com HTTP 422 e objeto `errors` por campo.
- REQ-008: Sucesso retorna HTTP 201 com dados da remessa criada.
- REQ-009: Erros de regra de negócio (`BusinessException`) retornam HTTP 422; `NotFoundException` retorna 404.

## Acceptance Criteria

- AC-001: Dado body incompleto, quando solicitar remessa, então retorna 422 com errors.
- AC-002: Dado status inválido, quando solicitar, então retorna 422.
- AC-003: Dado ZIP sem planilha/campo_chave, quando solicitar, então retorna 422.
- AC-004: Dado payload válido, quando solicitar, então retorna 201 com remessa.
- AC-005: Dado cliente sem crédito, quando solicitar, então retorna 422 com mensagem de negócio.
