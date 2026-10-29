/**
 * IMPORTS
 */
import { Test } from '@nestjs/testing';

// shared / storage
import { StorageService } from 'src/shared/storage/storage.service';

// exceptions
import { ArquivoObrigatorioException } from '../exceptions/arquivo-obrigatorio.exception';
import { RemessaNaoEncontradaException } from '../exceptions/remessa-nao-encontrada.exception';

// repositories
import { EnviarPlanilhaRemessaRepository } from '../repositories/enviar-planilha-remessa.repository';

// services
import { EnviarPlanilhaRemessaService } from '../services/enviar-planilha-remessa.service';

jest.mock('uuid', () => ({ v4: () => 'uuid-fixo' }));

describe('EnviarPlanilhaRemessaService', () => {
  let service: EnviarPlanilhaRemessaService;
  const repository = { buscarClienteDaRemessa: jest.fn(), registrarPlanilha: jest.fn() };
  const storage = {
    put: jest.fn(),
    montarCaminho: jest.fn((relativo: string) => `homologacao/${relativo}`),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    repository.buscarClienteDaRemessa.mockResolvedValue({ clienteId: 5n });
    repository.registrarPlanilha.mockResolvedValue({ id: 1n });
    const moduleRef = await Test.createTestingModule({
      providers: [
        EnviarPlanilhaRemessaService,
        { provide: EnviarPlanilhaRemessaRepository, useValue: repository },
        { provide: StorageService, useValue: storage },
      ],
    }).compile();

    service = moduleRef.get(EnviarPlanilhaRemessaService);
  });

  it('grava dentro da pasta raiz com uuid e extensão minúscula e usa a extensão como tipo', async () => {
    const arquivo = { buffer: Buffer.from('csv'), originalname: 'Dados.CSV' };

    await expect(service.execute(10n, arquivo)).resolves.toEqual({ id: 1n });

    expect(storage.put).toHaveBeenCalledWith(
      'homologacao/remessas/planilhas/10/uuid-fixo.csv',
      arquivo.buffer,
    );
    expect(repository.registrarPlanilha).toHaveBeenCalledWith({
      remessaId: 10n,
      clienteId: 5n,
      filePath: 'homologacao/remessas/planilhas/10/uuid-fixo.csv',
      tipo: 'csv',
    });
  });

  it('usa o tipo informado no lugar da extensão', async () => {
    await service.execute(10n, { buffer: Buffer.from('x'), originalname: 'a.xlsx' }, 'solicitacao');

    expect(repository.registrarPlanilha).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: 'solicitacao' }),
    );
  });

  it('lança 400 sem consultar a remessa quando o file não é enviado', async () => {
    await expect(service.execute(10n, undefined)).rejects.toThrow(
      new ArquivoObrigatorioException('file'),
    );
    expect(repository.buscarClienteDaRemessa).not.toHaveBeenCalled();
  });

  it('lança 404 sem gravar nada quando a remessa não existe', async () => {
    repository.buscarClienteDaRemessa.mockResolvedValue(null);

    await expect(
      service.execute(10n, { buffer: Buffer.from('csv'), originalname: 'a.csv' }),
    ).rejects.toBeInstanceOf(RemessaNaoEncontradaException);
    expect(storage.put).not.toHaveBeenCalled();
    expect(repository.registrarPlanilha).not.toHaveBeenCalled();
  });
});
