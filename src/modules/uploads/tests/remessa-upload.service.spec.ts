import { NotFoundException } from '@nestjs/common';
import { RemessaUploadService } from '../services/remessa-upload.service';

jest.mock('uuid', () => ({ v4: () => 'uuid-fixo' }));

describe('RemessaUploadService — pasta raiz do storage', () => {
  const prisma = {
    remessa: { findUnique: jest.fn() },
    remessaFoto: { create: jest.fn() },
    remessaPlanilha: { create: jest.fn() },
  };
  const storage = {
    put: jest.fn(),
    montarCaminho: jest.fn((relativo: string) => `homologacao/${relativo}`),
  };
  const zip = { extract: jest.fn() };
  let service: RemessaUploadService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.remessa.findUnique.mockResolvedValue({ clienteId: 5n });
    service = new RemessaUploadService(prisma as never, storage as never, zip as never);
  });

  it('grava as fotos do ZIP dentro da pasta raiz e persiste o mesmo caminho', async () => {
    zip.extract.mockResolvedValue([
      { name: '123.jpg', buffer: Buffer.from('a') },
      { name: '__MACOSX/._123.jpg', buffer: Buffer.from('b') },
    ]);

    const salvos = await service.processZipFotos(10n, {
      buffer: Buffer.from('zip'),
      originalname: 'f.zip',
    });

    expect(salvos).toEqual(['homologacao/remessas/fotos/10/123.jpg']);
    expect(storage.put).toHaveBeenCalledTimes(1);
    expect(storage.put).toHaveBeenCalledWith(
      'homologacao/remessas/fotos/10/123.jpg',
      Buffer.from('a'),
    );
    expect(prisma.remessaFoto.create).toHaveBeenCalledWith({
      data: { remessaId: 10n, clienteId: 5n, filePath: 'homologacao/remessas/fotos/10/123.jpg' },
    });
  });

  it('grava a planilha dentro da pasta raiz e persiste o mesmo caminho', async () => {
    const arquivo = { buffer: Buffer.from('csv'), originalname: 'Dados.CSV' };

    await service.uploadPlanilha(10n, arquivo);

    expect(storage.put).toHaveBeenCalledWith(
      'homologacao/remessas/planilhas/10/uuid-fixo.csv',
      arquivo.buffer,
    );
    expect(prisma.remessaPlanilha.create).toHaveBeenCalledWith({
      data: {
        remessaId: 10n,
        clienteId: 5n,
        filePath: 'homologacao/remessas/planilhas/10/uuid-fixo.csv',
        tipo: 'csv',
      },
    });
  });

  it('lança 404 sem gravar nada quando a remessa não existe', async () => {
    prisma.remessa.findUnique.mockResolvedValue(null);

    await expect(
      service.uploadPlanilha(10n, { buffer: Buffer.from('csv'), originalname: 'a.csv' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(storage.put).not.toHaveBeenCalled();
  });
});
