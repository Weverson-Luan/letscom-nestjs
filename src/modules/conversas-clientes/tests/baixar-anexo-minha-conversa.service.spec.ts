import { Test } from '@nestjs/testing';
import { SemAcessoConversaException } from '../exceptions/sem-acesso-conversa.exception';
import { StorageService } from 'src/shared/storage/storage.service';
import { AnexoAnotacaoNaoEncontradoException } from '../exceptions/anexo-anotacao-nao-encontrado.exception';
import { ClienteAnotacaoRepository } from '../repositories/cliente-anotacao.repository';
import { ConversaAcessoService } from '../services/conversa-acesso.service';
import { BaixarAnexoMinhaAnotacaoService } from '../services/baixar-anexo-minha-anotacao.service';
import { criarAnexoFake, criarUsuarioLogadoFake } from './fixtures';

describe('BaixarAnexoMinhaAnotacaoService', () => {
  const repository = { buscarAnexo: jest.fn() };
  const storage = { download: jest.fn() };
  const acesso = { garantirAcesso: jest.fn() };
  let service: BaixarAnexoMinhaAnotacaoService;
  const subordinado = criarUsuarioLogadoFake({ id: 3n, tipoLogin: 'subordinado', clienteId: 5n });

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        BaixarAnexoMinhaAnotacaoService,
        { provide: ClienteAnotacaoRepository, useValue: repository },
        { provide: ConversaAcessoService, useValue: acesso },
        { provide: StorageService, useValue: storage },
      ],
    }).compile();
    service = moduleRef.get(BaixarAnexoMinhaAnotacaoService);
    acesso.garantirAcesso.mockResolvedValue({
      participante: null,
      iniciada: true,
      semDonoInterno: false,
    });
    repository.buscarAnexo.mockResolvedValue(criarAnexoFake());
    storage.download.mockResolvedValue(Buffer.from('pdf'));
  });

  it('busca o anexo restrito à empresa do usuário logado', async () => {
    const resultado = await service.execute(30n, 40n, subordinado);

    expect(repository.buscarAnexo).toHaveBeenCalledWith(5n, 30n, 40n);
    expect(resultado).toMatchObject({ conteudo: Buffer.from('pdf'), mimeType: 'application/pdf' });
  });

  it('lança 404 sem empresa, para anexo de outra empresa ou ausente no storage', async () => {
    await expect(
      service.execute(30n, 40n, { ...subordinado, clienteId: null }),
    ).rejects.toBeInstanceOf(AnexoAnotacaoNaoEncontradoException);

    repository.buscarAnexo.mockResolvedValueOnce(null);
    await expect(service.execute(30n, 40n, subordinado)).rejects.toBeInstanceOf(
      AnexoAnotacaoNaoEncontradoException,
    );

    storage.download.mockResolvedValueOnce(null);
    await expect(service.execute(30n, 40n, subordinado)).rejects.toBeInstanceOf(
      AnexoAnotacaoNaoEncontradoException,
    );
  });

  it('lança 403 para quem não participa, sem baixar', async () => {
    acesso.garantirAcesso.mockRejectedValue(new SemAcessoConversaException());

    await expect(service.execute(30n, 40n, subordinado)).rejects.toBeInstanceOf(
      SemAcessoConversaException,
    );
    expect(repository.buscarAnexo).not.toHaveBeenCalled();
  });
});
