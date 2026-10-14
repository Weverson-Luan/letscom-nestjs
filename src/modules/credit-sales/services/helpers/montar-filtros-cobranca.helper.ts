/** Filtros da cobrança de créditos a partir da query (ListarCobrancaCreditoClienteRequest). */
export function montarFiltrosCobranca(query: Record<string, unknown>) {
  return {
    produtoId: query.produto_id ? BigInt(String(query.produto_id)) : undefined,
    numeroRemessa: query.numero_remessa ? String(query.numero_remessa) : undefined,
    statusRemessa: query.status_remessa as string | undefined,
    dataInicio: query.data_inicio as string | undefined,
    dataFim: query.data_fim as string | undefined,
  };
}
