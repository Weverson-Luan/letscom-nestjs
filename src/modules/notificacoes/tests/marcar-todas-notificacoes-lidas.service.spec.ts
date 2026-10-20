import { Test } from '@nestjs/testing';
import { NotificacaoRepository } from '../repositories/notificacao.repository';
import { MarcarTodasNotificacoesLidasService } from '../services/marcar-todas-notificacoes-lidas.service';
import { criarUsuarioFake } from './fixtures';

describe('MarcarTodasNotificacoesLidasService', () => {
  const repository = { marcarTodasLidas: jest.fn() };
  let service: MarcarTodasNotificacoesLidasService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        MarcarTodasNotificacoesLidasService,
        { provide: NotificacaoRepository, useValue: repository },
      ],
    }).compile();
    service = moduleRef.get(MarcarTodasNotificacoesLidasService);
  });

  it('marca todas as não lidas do usuário e devolve a quantidade', async () => {
    repository.marcarTodasLidas.mockResolvedValue({ count: 4 });

    await expect(service.execute(criarUsuarioFake())).resolves.toEqual({ marcadas: 4 });
    expect(repository.marcarTodasLidas).toHaveBeenCalledWith({ destinatarioUserId: 7n });
  });
});
