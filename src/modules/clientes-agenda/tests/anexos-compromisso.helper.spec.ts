import { AnexoCompromissoInvalidoException } from '../exceptions/anexo-compromisso-invalido.exception';
import {
  corrigirNomeArquivo,
  extrairExtensao,
  montarCaminhoAnexoCompromisso,
  normalizarNomesAnexos,
  validarAnexosCompromisso,
} from '../services/helpers/anexos-compromisso.helper';
import { criarArquivoFake } from './fixtures';

describe('validarAnexosCompromisso', () => {
  it('aceita lista vazia e arquivos dentro das regras', () => {
    expect(() => validarAnexosCompromisso([])).not.toThrow();
    expect(() =>
      validarAnexosCompromisso([
        criarArquivoFake(),
        criarArquivoFake({ originalname: 'FOTO.JPG' }),
        criarArquivoFake({ originalname: 'planilha.xlsx', size: 10 * 1024 * 1024 }),
      ]),
    ).not.toThrow();
  });

  it('aceita todas as extensões da lista', () => {
    const extensoes = 'jpg jpeg png gif webp pdf doc docx xls xlsx csv txt zip'.split(' ');
    for (const extensao of extensoes) {
      expect(() =>
        validarAnexosCompromisso([criarArquivoFake({ originalname: `a.${extensao}` })]),
      ).not.toThrow();
    }
  });

  it('recusa mais de 5 arquivos com status 400', () => {
    const arquivos = Array.from({ length: 6 }, () => criarArquivoFake());
    let erro: unknown;
    try {
      validarAnexosCompromisso(arquivos);
    } catch (e) {
      erro = e;
    }
    expect(erro).toBeInstanceOf(AnexoCompromissoInvalidoException);
    expect((erro as AnexoCompromissoInvalidoException).getStatus()).toBe(400);
    expect((erro as AnexoCompromissoInvalidoException).message).toBe(
      'Envie no máximo 5 arquivos por compromisso.',
    );
  });

  it('recusa arquivo acima de 10 MB', () => {
    expect(() =>
      validarAnexosCompromisso([criarArquivoFake({ size: 10 * 1024 * 1024 + 1 })]),
    ).toThrow('O arquivo proposta.pdf excede o limite de 10 MB.');
  });

  it('recusa arquivo vazio usando o tamanho do buffer quando size não vem', () => {
    expect(() =>
      validarAnexosCompromisso([criarArquivoFake({ size: undefined, buffer: Buffer.alloc(0) })]),
    ).toThrow('O arquivo proposta.pdf está vazio.');
  });

  it('recusa extensão fora da lista e arquivo sem extensão', () => {
    expect(() =>
      validarAnexosCompromisso([criarArquivoFake({ originalname: 'virus.exe' })]),
    ).toThrow(AnexoCompromissoInvalidoException);
    expect(() => validarAnexosCompromisso([criarArquivoFake({ originalname: 'LEIAME' })])).toThrow(
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

describe('montarCaminhoAnexoCompromisso', () => {
  it('usa o uuid no nome dentro da pasta da agenda do cliente', () => {
    expect(montarCaminhoAnexoCompromisso(5n, 'Proposta Final.PDF', 'abc-123')).toBe(
      'clientes/5/agenda/compromissos/abc-123.pdf',
    );
  });
});

describe('corrigirNomeArquivo / normalizarNomesAnexos', () => {
  // como o busboy entrega um nome UTF-8 lido como latin1
  const comoLatin1 = (nome: string) => Buffer.from(nome, 'utf8').toString('latin1');

  it('recupera acentos de nome UTF-8 lido como latin1', () => {
    expect(corrigirNomeArquivo(comoLatin1('orçamento.pdf'))).toBe('orçamento.pdf');
    expect(corrigirNomeArquivo(comoLatin1('relatório ção.xlsx'))).toBe('relatório ção.xlsx');
  });

  it('mantém nomes ASCII e nomes que não formam UTF-8 válido', () => {
    expect(corrigirNomeArquivo('proposta.pdf')).toBe('proposta.pdf');
    expect(corrigirNomeArquivo('café.pdf')).toBe('café.pdf');
  });

  it('corrige o nome de cada anexo sem alterar o conteúdo', () => {
    const arquivo = criarArquivoFake({ originalname: comoLatin1('orçamento.pdf') });
    const [normalizado] = normalizarNomesAnexos([arquivo]);
    expect(normalizado).toEqual({ ...arquivo, originalname: 'orçamento.pdf' });
  });
});
