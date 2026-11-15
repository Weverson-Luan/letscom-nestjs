/**
 * IMPORTS
 */
import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

// shared / auth, storage e planilha
import { FeatureGateService } from 'src/shared/auth/feature-gate.service';
import { AuthUser } from 'src/shared/decorators/current-user.decorator';
import { StorageService } from 'src/shared/storage/storage.service';
import { SpreadsheetService } from 'src/shared/utils/spreadsheet.service';

// repositories e services do módulo
import { ListarItensRemessaRepository } from '../repositories/listar-itens-remessa.repository';
import { ListarItensRemessaService } from '../services/listar-itens-remessa.service';

describe('ListarItensRemessaService', () => {
  let service: ListarItensRemessaService;
  const repository = { buscarRemessaComFotosEPlanilha: jest.fn() };
  const storage = { download: jest.fn(), getSignedUrl: jest.fn() };
  const spreadsheet = { parse: jest.fn() };
  const featureGate = { isUsuarioCliente: jest.fn() };

  const criadaEm = new Date('2026-11-15T10:00:00');
  const fotoAna = { id: 5n, matricula: '001', nome: 'Ana', filePath: 'fotos/001.jpg' };
  const remessa = {
    id: 1n,
    clienteId: 10n,
    createdAt: criadaEm,
    modeloTecnico: { campoChave: 'Matricula' },
    fotos: [fotoAna],
    planilhas: [{ filePath: 'planilhas/a.csv', tipo: 'csv' }],
  };
  const admin = { id: 1n, tipoLogin: 'user', roles: ['admin'] } as AuthUser;
  const VAZIO = { colunas: [], dataSolicitacao: null, itens: [] };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ListarItensRemessaService,
        { provide: ListarItensRemessaRepository, useValue: repository },
        { provide: StorageService, useValue: storage },
        { provide: SpreadsheetService, useValue: spreadsheet },
        { provide: FeatureGateService, useValue: featureGate },
      ],
    }).compile();
    service = moduleRef.get(ListarItensRemessaService);

    repository.buscarRemessaComFotosEPlanilha.mockResolvedValue(remessa);
    featureGate.isUsuarioCliente.mockReturnValue(false);
    storage.download.mockResolvedValue(Buffer.from('csv'));
    storage.getSignedUrl.mockResolvedValue('https://url/001.jpg');
    spreadsheet.parse.mockResolvedValue({
      headers: ['matricula', 'nome'],
      rows: [
        { matricula: '001', nome: 'Ana' },
        { matricula: '002', nome: 'Bia' },
      ],
    });
  });

  it('devolve as linhas da planilha com a URL da foto quando ela existe', async () => {
    const resultado = await service.execute(1n, admin);

    expect(resultado).toEqual({
      colunas: ['matricula', 'nome'],
      dataSolicitacao: criadaEm,
      itens: [
        { dados: { matricula: '001', nome: 'Ana' }, foto: fotoAna, url: 'https://url/001.jpg' },
        { dados: { matricula: '002', nome: 'Bia' }, foto: null, url: null },
      ],
    });
    expect(storage.getSignedUrl).toHaveBeenCalledTimes(1);
    expect(spreadsheet.parse).toHaveBeenCalledWith(Buffer.from('csv'), 'csv');
  });

  it('lê a planilha pela extensão do arquivo mesmo quando o tipo é outro valor', async () => {
    repository.buscarRemessaComFotosEPlanilha.mockResolvedValue({
      ...remessa,
      planilhas: [{ filePath: 'remessas/planilhas/1/x.xlsx', tipo: 'dados_variaveis' }],
    });

    await service.execute(1n, admin);

    expect(spreadsheet.parse).toHaveBeenCalledWith(Buffer.from('csv'), 'xlsx');
  });

  it('devolve os dados da planilha mesmo sem fotos e sem campo chave', async () => {
    repository.buscarRemessaComFotosEPlanilha.mockResolvedValue({
      ...remessa,
      fotos: [],
      modeloTecnico: { campoChave: null },
    });

    const resultado = await service.execute(1n, admin);

    expect(resultado.itens.map((item) => item.url)).toEqual([null, null]);
    expect(storage.getSignedUrl).not.toHaveBeenCalled();
  });

  it('deixa o cliente ver a própria remessa e o subordinado a do cliente dele', async () => {
    featureGate.isUsuarioCliente.mockReturnValue(true);

    await expect(
      service.execute(1n, { id: 10n, tipoLogin: 'user', roles: ['cliente'] } as AuthUser),
    ).resolves.toMatchObject({ colunas: ['matricula', 'nome'] });
    await expect(
      service.execute(1n, {
        id: 77n,
        tipoLogin: 'subordinado',
        clienteId: 10n,
        roles: ['subordinado'],
      } as AuthUser),
    ).resolves.toMatchObject({ colunas: ['matricula', 'nome'] });
  });

  it('lança 404 quando a remessa é de outro cliente', async () => {
    featureGate.isUsuarioCliente.mockReturnValue(true);

    await expect(
      service.execute(1n, { id: 99n, tipoLogin: 'user', roles: ['cliente'] } as AuthUser),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(storage.download).not.toHaveBeenCalled();
  });

  it('lança 404 quando a remessa não existe', async () => {
    repository.buscarRemessaComFotosEPlanilha.mockResolvedValue(null);

    await expect(service.execute(1n, admin)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('devolve vazio sem ler o storage quando a remessa não tem planilha', async () => {
    repository.buscarRemessaComFotosEPlanilha.mockResolvedValue({ ...remessa, planilhas: [] });

    await expect(service.execute(1n, admin)).resolves.toEqual(VAZIO);
    expect(storage.download).not.toHaveBeenCalled();
  });

  it('devolve vazio quando o arquivo da planilha não está no storage ou não pode ser lido', async () => {
    storage.download.mockResolvedValueOnce(null);
    await expect(service.execute(1n, admin)).resolves.toEqual(VAZIO);

    spreadsheet.parse.mockRejectedValueOnce(new Error('arquivo corrompido'));
    await expect(service.execute(1n, admin)).resolves.toEqual(VAZIO);
  });
});
