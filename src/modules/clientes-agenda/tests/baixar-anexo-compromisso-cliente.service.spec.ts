import { Test } from '@nestjs/testing';
import { StorageService } from 'src/shared/storage/storage.service';
import { AnexoCompromissoNaoEncontradoException } from '../exceptions/anexo-compromisso-nao-encontrado.exception';
import { ClienteCompromissoRepository } from '../repositories/cliente-compromisso.repository';
import { BaixarAnexoCompromissoClienteService } from '../services/baixar-anexo-compromisso-cliente.service';
import { criarAnexoCompromissoFake } from './fixtures';

describe('BaixarAnexoCompromissoClienteService', () => {
  const repository = { buscarAnexo: jest.fn() };
  const storage = { download: jest.fn() };
  let service: BaixarAnexoCompromissoClienteService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        BaixarAnexoCompromissoClienteService,
        { provide: ClienteCompromissoRepository, useValue: repository },
        { provide: StorageService, useValue: storage },
      ],
    }).compile();
    service = moduleRef.get(BaixarAnexoCompromissoClienteService);
    repository.buscarAnexo.mockResolvedValue(criarAnexoCompromissoFake());
    storage.download.mockResolvedValue(Buffer.from('pdf'));
  });

  it('devolve o conteúdo do storage com nome e tipo do anexo', async () => {
    const resultado = await service.execute(5n, 1n, 40n);

    expect(repository.buscarAnexo).toHaveBeenCalledWith(5n, 1n, 40n);
    expect(storage.download).toHaveBeenCalledWith('clientes/5/agenda/compromissos/uuid.pdf');
    expect(resultado).toEqual({
      conteudo: Buffer.from('pdf'),
      disposicao: `attachment; filename="orc_amento.pdf"; filename*=UTF-8''or%C3%A7amento.pdf`,
      mimeType: 'application/pdf',
    });
  });

  it('usa octet-stream quando o mime type não foi gravado', async () => {
    repository.buscarAnexo.mockResolvedValue(criarAnexoCompromissoFake({ mimeType: null }));

    await expect(service.execute(5n, 1n, 40n)).resolves.toMatchObject({
      mimeType: 'application/octet-stream',
    });
  });

  // o repository filtra por anexo + compromisso + cliente + compromisso não excluído
  it('lança 404 quando o anexo não existe, é de outro compromisso/cliente ou o compromisso foi excluído', async () => {
    repository.buscarAnexo.mockResolvedValue(null);

    const erro = await service.execute(5n, 1n, 40n).catch((e: unknown) => e);

    expect(erro).toBeInstanceOf(AnexoCompromissoNaoEncontradoException);
    expect((erro as AnexoCompromissoNaoEncontradoException).getStatus()).toBe(404);
    expect((erro as AnexoCompromissoNaoEncontradoException).message).toBe('Anexo não encontrado.');
    expect(storage.download).not.toHaveBeenCalled();
  });

  it('lança 404 quando o arquivo sumiu do storage', async () => {
    storage.download.mockResolvedValue(null);

    await expect(service.execute(5n, 1n, 40n)).rejects.toBeInstanceOf(
      AnexoCompromissoNaoEncontradoException,
    );
  });
});
