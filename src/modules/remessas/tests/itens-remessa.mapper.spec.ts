/**
 * IMPORTS
 */
// mappers do módulo
import { mapItensRemessa } from '../mappers/itens-remessa.mapper';

describe('mapItensRemessa', () => {
  it('usa a data do pedido em todas as linhas e foto nula quando a linha não tem foto', () => {
    const resultado = mapItensRemessa({
      colunas: ['matricula', 'cargo'],
      dataSolicitacao: new Date(2026, 10, 15, 9, 5),
      itens: [
        {
          dados: { matricula: '001', cargo: 'Analista' },
          foto: { id: 5n, matricula: '001', nome: 'Ana', filePath: 'fotos/001.jpg' },
          url: 'https://url/001.jpg',
        },
        { dados: { matricula: '002', cargo: 'Gerente' }, foto: null, url: null },
      ],
    });

    expect(resultado).toEqual({
      colunas: ['matricula', 'cargo'],
      itens: [
        {
          foto_id: 5n,
          matricula: '001',
          url: 'https://url/001.jpg',
          created_at: '15/11/2026 09:05',
          dados: { matricula: '001', cargo: 'Analista' },
        },
        {
          foto_id: null,
          matricula: null,
          url: null,
          created_at: '15/11/2026 09:05',
          dados: { matricula: '002', cargo: 'Gerente' },
        },
      ],
    });
  });
});
