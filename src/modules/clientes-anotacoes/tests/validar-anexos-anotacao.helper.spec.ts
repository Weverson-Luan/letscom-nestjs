import { AnotacaoClienteInvalidaException } from '../exceptions/anotacao-cliente-invalida.exception';
import {
  extrairExtensao,
  montarCaminhoAnexo,
  validarAnexosAnotacao,
} from '../services/helpers/validar-anexos-anotacao.helper';
import { criarArquivoFake } from './fixtures';

describe('validarAnexosAnotacao', () => {
  it('aceita lista vazia e arquivos dentro das regras', () => {
    expect(() => validarAnexosAnotacao([])).not.toThrow();
    expect(() =>
      validarAnexosAnotacao([
        criarArquivoFake(),
        criarArquivoFake({ originalname: 'FOTO.JPG' }),
        criarArquivoFake({ originalname: 'planilha.xlsx', size: 10 * 1024 * 1024 }),
      ]),
    ).not.toThrow();
  });

  it('recusa mais de 5 arquivos', () => {
    const arquivos = Array.from({ length: 6 }, () => criarArquivoFake());
    expect(() => validarAnexosAnotacao(arquivos)).toThrow(
      new AnotacaoClienteInvalidaException('Envie no máximo 5 arquivos por anotação.'),
    );
  });

  it('recusa arquivo acima de 10 MB', () => {
    expect(() => validarAnexosAnotacao([criarArquivoFake({ size: 10 * 1024 * 1024 + 1 })])).toThrow(
      'O arquivo proposta.pdf excede o limite de 10 MB.',
    );
  });

  it('recusa arquivo vazio usando o tamanho do buffer quando size não vem', () => {
    expect(() =>
      validarAnexosAnotacao([criarArquivoFake({ size: undefined, buffer: Buffer.alloc(0) })]),
    ).toThrow('O arquivo proposta.pdf está vazio.');
  });

  it('recusa extensão fora da lista e arquivo sem extensão', () => {
    expect(() => validarAnexosAnotacao([criarArquivoFake({ originalname: 'virus.exe' })])).toThrow(
      AnotacaoClienteInvalidaException,
    );
    expect(() => validarAnexosAnotacao([criarArquivoFake({ originalname: 'LEIAME' })])).toThrow(
      'Tipo de arquivo não permitido: LEIAME.',
    );
  });
});

describe('extrairExtensao', () => {
  it('devolve a última extensão em minúsculas ou vazio', () => {
    expect(extrairExtensao('a.tar.ZIP')).toBe('zip');
    expect(extrairExtensao('semextensao')).toBe('');
  });
});

describe('montarCaminhoAnexo', () => {
  it('usa o uuid no nome para não expor nem colidir com o nome original', () => {
    expect(montarCaminhoAnexo(5n, 'Proposta Final.PDF', 'abc-123')).toBe(
      'clientes/5/anotacoes/abc-123.pdf',
    );
  });
});
