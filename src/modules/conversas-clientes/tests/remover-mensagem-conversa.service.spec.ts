import { Test } from '@nestjs/testing';
import { SemAcessoConversaException } from '../exceptions/sem-acesso-conversa.exception';
import { MensagemConversaNaoEncontradaException } from '../exceptions/mensagem-conversa-nao-encontrada.exception';
import { SemPermissaoMensagemConversaException } from '../exceptions/sem-permissao-mensagem-conversa.exception';
import { ConversaMensagemRepository } from '../repositories/conversa-mensagem.repository';
import { ConversaAcessoService } from '../services/conversa-acesso.service';
import { RemoverMensagemConversaService } from '../services/remover-mensagem-conversa.service';
import { criarMensagemFake, criarUsuarioLogadoFake } from './fixtures';

describe('RemoverMensagemConversaService', () => {
  const repository = { buscarPorId: jest.fn(), remover: jest.fn() };
  const acesso = { garantirAcesso: jest.fn() };
  let service: RemoverMensagemConversaService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        RemoverMensagemConversaService,
        { provide: ConversaMensagemRepository, useValue: repository },
        { provide: ConversaAcessoService, useValue: acesso },
      ],
    }).compile();
    service = moduleRef.get(RemoverMensagemConversaService);
    acesso.garantirAcesso.mockResolvedValue({
      participante: null,
      iniciada: true,
      semDonoInterno: false,
    });
    repository.buscarPorId.mockResolvedValue(criarMensagemFake());
  });

  it('o autor exclui a própria mensagem', async () => {
    await service.execute(5n, 30n, criarUsuarioLogadoFake());

    expect(repository.buscarPorId).toHaveBeenCalledWith(5n, 30n);
    expect(repository.remover).toHaveBeenCalledWith(30n);
  });

  it('admin exclui mensagem de outro usuário', async () => {
    await service.execute(5n, 30n, criarUsuarioLogadoFake({ id: 99n, roles: ['admin'] }));

    expect(repository.remover).toHaveBeenCalledWith(30n);
  });

  it('lança 403 para quem não é autor nem admin', async () => {
    await expect(
      service.execute(5n, 30n, criarUsuarioLogadoFake({ id: 99n })),
    ).rejects.toBeInstanceOf(SemPermissaoMensagemConversaException);
    expect(repository.remover).not.toHaveBeenCalled();
  });

  it('lança 404 quando a mensagem não existe', async () => {
    repository.buscarPorId.mockResolvedValue(null);

    await expect(service.execute(5n, 30n, criarUsuarioLogadoFake())).rejects.toBeInstanceOf(
      MensagemConversaNaoEncontradaException,
    );
  });

  it('lança 403 para quem não participa da conversa, sem buscar a mensagem', async () => {
    acesso.garantirAcesso.mockRejectedValue(new SemAcessoConversaException());

    await expect(service.execute(5n, 30n, criarUsuarioLogadoFake())).rejects.toBeInstanceOf(
      SemAcessoConversaException,
    );
    expect(repository.buscarPorId).not.toHaveBeenCalled();
  });
});
