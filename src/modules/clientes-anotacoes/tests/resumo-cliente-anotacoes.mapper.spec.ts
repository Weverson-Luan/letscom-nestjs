import { mapearResumoClienteAnotacoes } from '../mappers/resumo-cliente-anotacoes.mapper';
import { criarLinhaResumoFake } from './fixtures';

describe('mapearResumoClienteAnotacoes', () => {
  it('converte ativo (tinyint) e total (bigint) do SQL cru', () => {
    const linha = criarLinhaResumoFake();
    expect(mapearResumoClienteAnotacoes(linha)).toEqual({
      id: 5n,
      nome: 'Empresa X',
      email: 'contato@empresax.com',
      telefone: '11988887777',
      documento: '12345678000199',
      ativo: true,
      total_anotacoes: 3,
      ultima_anotacao_em: linha.ultima_anotacao_em,
    });
  });

  it('mantém cliente sem anotação com total zero e data nula', () => {
    expect(
      mapearResumoClienteAnotacoes(
        criarLinhaResumoFake({ ativo: 0, total_anotacoes: 0n, ultima_anotacao_em: null }),
      ),
    ).toMatchObject({ ativo: false, total_anotacoes: 0, ultima_anotacao_em: null });
  });
});
