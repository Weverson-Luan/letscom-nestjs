/**
 * IMPORTS
 */

// mappers
import {
  mapearPlanilhaRemessa,
  montarRespostaFotosEnviadas,
} from '../mappers/upload-remessa.mapper';

describe('montarRespostaFotosEnviadas', () => {
  it('devolve o formato do Laravel com os caminhos gravados', () => {
    expect(montarRespostaFotosEnviadas(['remessas/fotos/10/1.jpg'])).toEqual({
      code: 200,
      message: 'Fotos extraídas e salvas com sucesso.',
      files: ['remessas/fotos/10/1.jpg'],
    });
  });
});

describe('mapearPlanilhaRemessa', () => {
  it('devolve só os campos do contrato, em snake_case', () => {
    const criadoEm = new Date('2026-01-01T10:00:00Z');

    const resultado = mapearPlanilhaRemessa({
      id: 1n,
      remessaId: 10n,
      clienteId: 5n,
      filePath: 'remessas/planilhas/10/a.csv',
      tipo: 'csv',
      createdAt: criadoEm,
      updatedAt: criadoEm,
    });

    expect(resultado).toEqual({
      id: 1n,
      remessa_id: 10n,
      cliente_id: 5n,
      file_path: 'remessas/planilhas/10/a.csv',
      tipo: 'csv',
      created_at: criadoEm,
    });
  });
});
