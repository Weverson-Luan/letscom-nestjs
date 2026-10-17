import { Test } from '@nestjs/testing';
import { StorageService } from 'src/shared/storage/storage.service';
import { AnexoAnotacaoNaoEncontradoException } from '../exceptions/anexo-anotacao-nao-encontrado.exception';
import { ClienteAnotacaoRepository } from '../repositories/cliente-anotacao.repository';
import { BaixarAnexoAnotacaoClienteService } from '../services/baixar-anexo-anotacao-cliente.service';
import { criarAnexoFake } from './fixtures';

describe('BaixarAnexoAnotacaoClienteService', () => {
  const repository = { buscarAnexo: jest.fn() };
  const storage = { download: jest.fn() };
  let service: BaixarAnexoAnotacaoClienteService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        BaixarAnexoAnotacaoClienteService,
        { provide: ClienteAnotacaoRepository, useValue: repository },
        { provide: StorageService, useValue: storage },
      ],
    }).compile();
    service = moduleRef.get(BaixarAnexoAnotacaoClienteService);
    repository.buscarAnexo.mockResolvedValue(criarAnexoFake());
    storage.download.mockResolvedValue(Buffer.from('pdf'));
  });

  it('devolve o conteúdo do storage com nome e tipo do anexo', async () => {
    const resultado = await service.execute(5n, 30n, 40n);

    expect(repository.buscarAnexo).toHaveBeenCalledWith(5n, 30n, 40n);
    expect(storage.download).toHaveBeenCalledWith('clientes/5/anotacoes/uuid.pdf');
    expect(resultado).toEqual({
      conteudo: Buffer.from('pdf'),
      disposicao: expect.stringContaining("filename*=UTF-8''or%C3%A7amento.pdf"),
      mimeType: 'application/pdf',
    });
  });

  it('usa octet-stream quando o mime type não foi gravado', async () => {
    repository.buscarAnexo.mockResolvedValue({ ...criarAnexoFake(), mimeType: null });

    await expect(service.execute(5n, 30n, 40n)).resolves.toMatchObject({
      mimeType: 'application/octet-stream',
    });
  });

  it('lança 404 quando o anexo não pertence à anotação/cliente', async () => {
    repository.buscarAnexo.mockResolvedValue(null);

    await expect(service.execute(5n, 30n, 40n)).rejects.toBeInstanceOf(
      AnexoAnotacaoNaoEncontradoException,
    );
    expect(storage.download).not.toHaveBeenCalled();
  });

  it('lança 404 quando o arquivo sumiu do storage', async () => {
    storage.download.mockResolvedValue(null);

    await expect(service.execute(5n, 30n, 40n)).rejects.toBeInstanceOf(
      AnexoAnotacaoNaoEncontradoException,
    );
  });
});
