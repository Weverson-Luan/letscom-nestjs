import { Test } from '@nestjs/testing';
import { SemAcessoConversaException } from '../exceptions/sem-acesso-conversa.exception';
import { StorageService } from 'src/shared/storage/storage.service';
import { AnexoMensagemNaoEncontradoException } from '../exceptions/anexo-mensagem-nao-encontrado.exception';
import { ConversaMensagemRepository } from '../repositories/conversa-mensagem.repository';
import { ConversaAcessoService } from '../services/conversa-acesso.service';
import { BaixarAnexoMinhaConversaService } from '../services/baixar-anexo-minha-conversa.service';
import { criarAnexoFake, criarParticipanteFake, criarUsuarioLogadoFake } from './fixtures';

describe('BaixarAnexoMinhaConversaService', () => {
  const repository = { buscarAnexo: jest.fn() };
  const storage = { download: jest.fn() };
  const acesso = { garantirAcesso: jest.fn() };
  let service: BaixarAnexoMinhaConversaService;
  const subordinado = criarUsuarioLogadoFake({ id: 3n, tipoLogin: 'subordinado', clienteId: 5n });

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        BaixarAnexoMinhaConversaService,
        { provide: ConversaMensagemRepository, useValue: repository },
        { provide: ConversaAcessoService, useValue: acesso },
        { provide: StorageService, useValue: storage },
      ],
    }).compile();
    service = moduleRef.get(BaixarAnexoMinhaConversaService);
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

    expect(repository.buscarAnexo).toHaveBeenCalledWith(5n, 30n, 40n, null);
    expect(resultado).toMatchObject({ conteudo: Buffer.from('pdf'), mimeType: 'application/pdf' });
  });

  it('lança 404 sem empresa, para anexo de outra empresa ou ausente no storage', async () => {
    await expect(
      service.execute(30n, 40n, { ...subordinado, clienteId: null }),
    ).rejects.toBeInstanceOf(AnexoMensagemNaoEncontradoException);

    repository.buscarAnexo.mockResolvedValueOnce(null);
    await expect(service.execute(30n, 40n, subordinado)).rejects.toBeInstanceOf(
      AnexoMensagemNaoEncontradoException,
    );

    storage.download.mockResolvedValueOnce(null);
    await expect(service.execute(30n, 40n, subordinado)).rejects.toBeInstanceOf(
      AnexoMensagemNaoEncontradoException,
    );
  });

  it('lança 403 para quem não participa, sem baixar', async () => {
    acesso.garantirAcesso.mockRejectedValue(new SemAcessoConversaException());

    await expect(service.execute(30n, 40n, subordinado)).rejects.toBeInstanceOf(
      SemAcessoConversaException,
    );
    expect(repository.buscarAnexo).not.toHaveBeenCalled();
  });

  it('convidado busca o anexo com o corte de quando aceitou o convite', async () => {
    const aceitouEm = new Date('2026-10-15T09:00:00.000Z');
    acesso.garantirAcesso.mockResolvedValue({
      participante: criarParticipanteFake({
        userId: null,
        subordinadoId: 3n,
        papel: 'convidado',
        respondidoEm: aceitouEm,
      }),
      iniciada: true,
      semDonoInterno: false,
    });

    await service.execute(30n, 40n, subordinado);

    expect(repository.buscarAnexo).toHaveBeenCalledWith(5n, 30n, 40n, aceitouEm);
  });
});
