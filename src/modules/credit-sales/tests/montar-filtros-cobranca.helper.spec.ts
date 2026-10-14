import { montarFiltrosCobranca } from '../services/helpers/montar-filtros-cobranca.helper';

describe('montarFiltrosCobranca', () => {
  it('converte a query nos filtros da cobrança', () => {
    expect(
      montarFiltrosCobranca({
        produto_id: '2',
        numero_remessa: 123,
        status_remessa: 'concluido',
        data_inicio: '2026-10-01',
        data_fim: '2026-10-31',
      }),
    ).toEqual({
      produtoId: 2n,
      numeroRemessa: '123',
      statusRemessa: 'concluido',
      dataInicio: '2026-10-01',
      dataFim: '2026-10-31',
    });
  });

  it('deixa indefinidos os filtros ausentes', () => {
    expect(montarFiltrosCobranca({})).toEqual({
      produtoId: undefined,
      numeroRemessa: undefined,
      statusRemessa: undefined,
      dataInicio: undefined,
      dataFim: undefined,
    });
  });
});
