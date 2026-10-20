import { montarContentDisposition } from '../services/helpers/montar-content-disposition.helper';

describe('montarContentDisposition', () => {
  it('gera fallback ASCII e filename* em UTF-8 para nomes acentuados', () => {
    expect(montarContentDisposition('orçamento.pdf')).toBe(
      `attachment; filename="orc_amento.pdf"; filename*=UTF-8''or%C3%A7amento.pdf`,
    );
  });

  it('neutraliza aspas e quebras de linha que injetariam headers', () => {
    const valor = montarContentDisposition('a"b\r\nSet-Cookie: x.txt');
    expect(valor).not.toMatch(/[\r\n]/);
    expect(valor).toContain('filename="a_b__Set-Cookie: x.txt"');
  });
});
