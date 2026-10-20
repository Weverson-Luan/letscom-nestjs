import { Test } from '@nestjs/testing';
import { SemAcessoConversaException } from '../exceptions/sem-acesso-conversa.exception';
import { StorageService } from 'src/shared/storage/storage.service';
import { AnexoAnotacaoNaoEncontradoException } from '../exceptions/anexo-anotacao-nao-encontrado.exception';
import { ClienteAnotacaoRepository } from '../repositories/cliente-anotacao.repository';
import { ConversaAcessoService } from '../services/conversa-acesso.service';
import { BaixarAnexoAnotacaoClienteService } from '../services/baixar-anexo-anotacao-cliente.service';
import { criarAnexoFake, criarUsuarioLogadoFake } from './fixtures';

describe('BaixarAnexoAnotacaoClienteService', () => {
  const repository = { buscarAnexo: jest.fn() };
  const storage = { download: jest.fn() };
  const usuario = criarUsuarioLogadoFake();
  const acesso = { garantirAcesso: jest.fn() };
  let service: BaixarAnexoAnotacaoClienteService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        BaixarAnexoAnotacaoClienteService,
        { provide: ClienteAnotacaoRepository, useValue: repository },
        { provide: ConversaAcessoService, useValue: acesso },
        { provide: StorageService, useValue: storage },
      ],
    }).compile();
    service = moduleRef.get(BaixarAnexoAnotacaoClienteService);
    acesso.garantirAcesso.mockResolvedValue({
      participante: null,
      iniciada: true,
      semDonoInterno: false,
    });
    repository.buscarAnexo.mockResolvedValue(criarAnexoFake());
    storage.download.mockResolvedValue(Buffer.from('pdf'));
  });

  it('devolve o conteúdo do storage com nome e tipo do anexo', async () => {
    const resultado = await service.execute(5n, 30n, 40n, usuario);

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

    await expect(service.execute(5n, 30n, 40n, usuario)).resolves.toMatchObject({
      mimeType: 'application/octet-stream',
    });
  });

  it('lança 404 quando o anexo não pertence à anotação/cliente', async () => {
    repository.buscarAnexo.mockResolvedValue(null);

    await expect(service.execute(5n, 30n, 40n, usuario)).rejects.toBeInstanceOf(
      AnexoAnotacaoNaoEncontradoException,
    );
    expect(storage.download).not.toHaveBeenCalled();
  });

  it('lança 404 quando o arquivo sumiu do storage', async () => {
    storage.download.mockResolvedValue(null);

    await expect(service.execute(5n, 30n, 40n, usuario)).rejects.toBeInstanceOf(
      AnexoAnotacaoNaoEncontradoException,
    );
  });

  it('lança 403 para quem não participa, sem baixar', async () => {
    acesso.garantirAcesso.mockRejectedValue(new SemAcessoConversaException());

    await expect(service.execute(5n, 30n, 40n, usuario)).rejects.toBeInstanceOf(
      SemAcessoConversaException,
    );
    expect(acesso.garantirAcesso).toHaveBeenCalledWith(5n, usuario);
    expect(repository.buscarAnexo).not.toHaveBeenCalled();
  });
});
