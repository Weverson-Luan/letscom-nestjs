/**
 * Enums do domínio de créditos — espelham os App\Enums do Laravel
 * (TipoOperacaoCreditoCliente / DirecaoMovimentoCreditoCliente).
 * Armazenados como string nas colunas Prisma (tipo_operacao / direcao_movimento).
 */
export enum TipoOperacaoCreditoCliente {
  COMPRA_CREDITOS = 'compra_creditos',
  LIBERACAO_CREDITOS_PENDENTE = 'liberacao_creditos_pendente',
  CONSUMO_REMESSA = 'consumo_remessa',
  ESTORNO_CANCELAMENTO_REMESSA = 'estorno_cancelamento_remessa',
  ESTORNO_CANCELAMENTO_VENDA_CREDITOS = 'estorno_cancelamento_venda_creditos',
  AJUSTE_ADMINISTRATIVO = 'ajuste_administrativo',
}

export const TIPOS_OPERACAO_CREDITO = Object.values(
  TipoOperacaoCreditoCliente,
) as string[];

export enum DirecaoMovimentoCreditoCliente {
  ENTRADA = 'entrada',
  SAIDA = 'saida',
}

export const DIRECOES_MOVIMENTO_CREDITO = Object.values(
  DirecaoMovimentoCreditoCliente,
) as string[];
