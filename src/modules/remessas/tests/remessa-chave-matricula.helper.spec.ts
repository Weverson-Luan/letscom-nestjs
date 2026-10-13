import {
  normalizarChaveParaComparacao,
  resolverMatriculaNaPlanilha,
  sanitizarChaveMatricula,
} from '../helpers/remessa-chave-matricula.helper';

describe('RemessaChaveMatriculaHelper', () => {
  const cpfComNbsp = ' 038.639.437-75';

  it('remove NBSP invisível prefixado', () => {
    expect(sanitizarChaveMatricula(cpfComNbsp)).toBe('038.639.437-75');
  });

  it('remove espaços normais e BOM', () => {
    expect(sanitizarChaveMatricula('﻿  038.639.437-75  ')).toBe('038.639.437-75');
  });

  it('normaliza ignorando hífen, underscore e case', () => {
    expect(normalizarChaveParaComparacao('038.639.437-75')).toBe('038.639.43775');
    expect(normalizarChaveParaComparacao('038-639-437-75')).toBe('03863943775');
    expect(normalizarChaveParaComparacao('038_639_437_75')).toBe('03863943775');
    expect(normalizarChaveParaComparacao('038.639.437_75')).toBe('038.639.43775');
  });

  it('encontra CPF com NBSP na planilha não sanitizada', () => {
    const dados = { [cpfComNbsp]: { matricula: cpfComNbsp, nome: 'Elaudia' } };
    expect(resolverMatriculaNaPlanilha(dados, '038.639.437-75')).toBe(cpfComNbsp);
  });

  it('encontra por hífen/underscore alternativos', () => {
    const dados = { '038-639-437-75': { matricula: '038-639-437-75', nome: 'Elaudia' } };
    expect(resolverMatriculaNaPlanilha(dados, '038_639_437_75')).toBe('038-639-437-75');
  });

  it('retorna null quando não existe', () => {
    const dados = { '112.094.526-77': { matricula: '112.094.526-77', nome: 'Daniel' } };
    expect(resolverMatriculaNaPlanilha(dados, '038.639.437-75')).toBeNull();
  });

  it('planilha sanitizada fica indexada pela chave limpa', () => {
    const cpfLimpo = sanitizarChaveMatricula(cpfComNbsp);
    const dados = { [cpfLimpo]: { matricula: cpfLimpo, nome: 'Elaudia' } };
    expect(cpfLimpo).toBe('038.639.437-75');
    expect(resolverMatriculaNaPlanilha(dados, '038.639.437-75')).toBe(cpfLimpo);
  });
});
