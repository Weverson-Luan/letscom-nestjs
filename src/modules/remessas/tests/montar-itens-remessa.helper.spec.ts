/**
 * IMPORTS
 */
// helpers do módulo
import { montarItensRemessa } from '../services/helpers/montar-itens-remessa.helper';

describe('montarItensRemessa', () => {
  const foto = (id: number, matricula: string | null, filePath = `fotos/${matricula}.jpg`) => ({
    id: BigInt(id),
    matricula,
    nome: 'Nome',
    filePath,
  });
  const planilha = {
    headers: ['matricula', 'nome', 'cargo'],
    rows: [
      { matricula: '001', nome: 'Ana', cargo: 'Analista' },
      { matricula: '002', nome: 'Bia', cargo: '' },
      { matricula: '', nome: '', cargo: '' },
    ],
  };

  it('devolve as linhas com dados e junta a foto de mesma matrícula', () => {
    const resultado = montarItensRemessa(planilha, [foto(1, '001')], 'Matricula');

    expect(resultado.colunas).toEqual(['matricula', 'nome', 'cargo']);
    expect(resultado.itens).toEqual([
      { dados: { matricula: '001', nome: 'Ana', cargo: 'Analista' }, foto: foto(1, '001') },
      { dados: { matricula: '002', nome: 'Bia', cargo: '' }, foto: null },
    ]);
  });

  it('devolve as linhas sem foto quando a remessa não tem fotos', () => {
    const resultado = montarItensRemessa(planilha, [], 'matricula');

    expect(resultado.itens.map((item) => item.foto)).toEqual([null, null]);
  });

  it('devolve as linhas sem foto quando o campo chave não existe na planilha', () => {
    const resultado = montarItensRemessa(planilha, [foto(1, '001')], 'cpf');

    expect(resultado.itens).toHaveLength(2);
    expect(resultado.itens.every((item) => item.foto === null)).toBe(true);
  });

  it('compara a chave ignorando hífen, underscore e caixa', () => {
    const resultado = montarItensRemessa(
      { headers: ['cpf', 'nome'], rows: [{ cpf: 'AB-01', nome: 'Ana' }] },
      [foto(1, 'ab_01')],
      'cpf',
    );

    expect(resultado.itens[0].foto).toEqual(foto(1, 'ab_01'));
  });

  it('ignora foto sem arquivo e devolve vazio quando a planilha não tem dados', () => {
    expect(
      montarItensRemessa(planilha, [foto(1, '001', '')], 'matricula').itens[0].foto,
    ).toBeNull();
    expect(
      montarItensRemessa({ headers: ['matricula'], rows: [{ matricula: ' ' }] }, [], 'matricula'),
    ).toEqual({ colunas: [], itens: [] });
  });
});
