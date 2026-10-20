import { Test } from '@nestjs/testing';
import { NotificacaoNaoEncontradaException } from '../exceptions/notificacao-nao-encontrada.exception';
import { NotificacaoRepository } from '../repositories/notificacao.repository';
import { MarcarNotificacaoLidaService } from '../services/marcar-notificacao-lida.service';
import { criarNotificacaoFake, criarUsuarioFake } from './fixtures';

describe('MarcarNotificacaoLidaService', () => {
  const repository = { buscarDoDestinatario: jest.fn(), marcarLida: jest.fn() };
  let service: MarcarNotificacaoLidaService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        MarcarNotificacaoLidaService,
        { provide: NotificacaoRepository, useValue: repository },
      ],
    }).compile();
    service = moduleRef.get(MarcarNotificacaoLidaService);
  });

  it('marca como lida a notificação do próprio usuário', async () => {
    const lidaEm = new Date();
    repository.buscarDoDestinatario.mockResolvedValue(criarNotificacaoFake());
    repository.marcarLida.mockResolvedValue(criarNotificacaoFake({ lidaEm }));

    await expect(service.execute(50n, criarUsuarioFake())).resolves.toMatchObject({ lida: true });
    expect(repository.buscarDoDestinatario).toHaveBeenCalledWith(50n, { destinatarioUserId: 7n });
    expect(repository.marcarLida).toHaveBeenCalledWith(50n);
  });

  it('não regrava quando já estava lida', async () => {
    repository.buscarDoDestinatario.mockResolvedValue(criarNotificacaoFake({ lidaEm: new Date() }));

    await service.execute(50n, criarUsuarioFake());

    expect(repository.marcarLida).not.toHaveBeenCalled();
  });

  it('lança 404 para notificação de outro usuário', async () => {
    repository.buscarDoDestinatario.mockResolvedValue(null);

    await expect(
      service.execute(50n, criarUsuarioFake({ id: 3n, tipoLogin: 'subordinado' })),
    ).rejects.toBeInstanceOf(NotificacaoNaoEncontradaException);
    expect(repository.buscarDoDestinatario).toHaveBeenCalledWith(50n, {
      destinatarioSubordinadoId: 3n,
    });
  });
});
