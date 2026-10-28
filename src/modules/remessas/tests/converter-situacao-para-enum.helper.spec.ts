import { converterSituacaoParaEnum } from '../services/helpers/converter-situacao-para-enum.helper';
import { BusinessException } from 'src/shared/exceptions/business.exception';

describe('converterSituacaoParaEnum', () => {
  it('converte o valor gravado no banco para a chave do enum', () => {
    expect(converterSituacaoParaEnum('pronto para imprimir')).toBe('pronto_para_imprimir');
    expect(converterSituacaoParaEnum('a fazer')).toBe('a_fazer');
    expect(converterSituacaoParaEnum('enviar pdf')).toBe('enviar_pdf');
  });

  it('mantém a chave do enum quando já vem no formato correto', () => {
    expect(converterSituacaoParaEnum('pronto_para_imprimir')).toBe('pronto_para_imprimir');
    expect(converterSituacaoParaEnum('em_producao')).toBe('em_producao');
  });

  it('rejeita situação inexistente', () => {
    expect(() => converterSituacaoParaEnum('qualquer coisa')).toThrow(BusinessException);
  });
});
