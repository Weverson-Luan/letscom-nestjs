/**
 * IMPORTS
 */
import { Test } from '@nestjs/testing';

// shared / storage e zip
import { StorageService } from 'src/shared/storage/storage.service';
import { ZipService } from 'src/shared/utils/zip.service';

// exceptions
import { ArquivoObrigatorioException } from '../exceptions/arquivo-obrigatorio.exception';
import { RemessaNaoEncontradaException } from '../exceptions/remessa-nao-encontrada.exception';

// repositories
import { EnviarFotosRemessaRepository } from '../repositories/enviar-fotos-remessa.repository';

// services
import { EnviarFotosRemessaService } from '../services/enviar-fotos-remessa.service';

describe('EnviarFotosRemessaService', () => {
  let service: EnviarFotosRemessaService;
  const repository = { buscarClienteDaRemessa: jest.fn(), registrarFoto: jest.fn() };
  const storage = {
    put: jest.fn(),
    montarCaminho: jest.fn((relativo: string) => `homologacao/${relativo}`),
  };
  const zip = { extract: jest.fn() };
  const arquivo = { buffer: Buffer.from('zip'), originalname: 'fotos.zip' };

  beforeEach(async () => {
    jest.clearAllMocks();
    repository.buscarClienteDaRemessa.mockResolvedValue({ clienteId: 5n });
    const moduleRef = await Test.createTestingModule({
      providers: [
        EnviarFotosRemessaService,
        { provide: EnviarFotosRemessaRepository, useValue: repository },
        { provide: StorageService, useValue: storage },
        { provide: ZipService, useValue: zip },
      ],
    }).compile();

    service = moduleRef.get(EnviarFotosRemessaService);
  });

  it('grava as fotos dentro da pasta raiz, registra o mesmo caminho e ignora metadados do macOS', async () => {
    zip.extract.mockResolvedValue([
      { name: '123.jpg', buffer: Buffer.from('a') },
      { name: '__MACOSX/._123.jpg', buffer: Buffer.from('b') },
      { name: '456.jpg', buffer: Buffer.from('c') },
    ]);

    const caminhos = await service.execute(10n, arquivo);

    expect(zip.extract).toHaveBeenCalledWith(arquivo.buffer);
    expect(caminhos).toEqual([
      'homologacao/remessas/fotos/10/123.jpg',
      'homologacao/remessas/fotos/10/456.jpg',
    ]);
    expect(storage.put).toHaveBeenCalledTimes(2);
    expect(storage.put).toHaveBeenCalledWith(
      'homologacao/remessas/fotos/10/123.jpg',
      Buffer.from('a'),
    );
    expect(repository.registrarFoto).toHaveBeenCalledWith({
      remessaId: 10n,
      clienteId: 5n,
      filePath: 'homologacao/remessas/fotos/10/123.jpg',
    });
  });

  it('devolve lista vazia quando o ZIP não tem fotos', async () => {
    zip.extract.mockResolvedValue([]);

    await expect(service.execute(10n, arquivo)).resolves.toEqual([]);
    expect(repository.registrarFoto).not.toHaveBeenCalled();
  });

  it('lança 400 sem consultar a remessa quando o zip_file não é enviado', async () => {
    await expect(service.execute(10n, undefined)).rejects.toThrow(
      new ArquivoObrigatorioException('zip_file'),
    );
    expect(repository.buscarClienteDaRemessa).not.toHaveBeenCalled();
  });

  it('lança 404 sem extrair nem gravar quando a remessa não existe', async () => {
    repository.buscarClienteDaRemessa.mockResolvedValue(null);

    await expect(service.execute(10n, arquivo)).rejects.toBeInstanceOf(
      RemessaNaoEncontradaException,
    );
    expect(zip.extract).not.toHaveBeenCalled();
    expect(storage.put).not.toHaveBeenCalled();
  });
});
