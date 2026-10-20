import { Test } from '@nestjs/testing';
import { NotificacaoRepository } from '../repositories/notificacao.repository';
import { MarcarNotificacoesConviteLidasService } from '../services/marcar-notificacoes-convite-lidas.service';

describe('MarcarNotificacoesConviteLidasService', () => {
  const repository = { marcarLidasDoParticipante: jest.fn() };
  let service: MarcarNotificacoesConviteLidasService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        MarcarNotificacoesConviteLidasService,
        { provide: NotificacaoRepository, useValue: repository },
      ],
    }).compile();
    service = moduleRef.get(MarcarNotificacoesConviteLidasService);
  });

  it('marca as notificações do convite na transação e devolve quantas', async () => {
    const tx = {} as never;
    repository.marcarLidasDoParticipante.mockResolvedValue({ count: 2 });

    await expect(service.execute(60n, tx)).resolves.toBe(2);
    expect(repository.marcarLidasDoParticipante).toHaveBeenCalledWith(60n, tx);
  });
});
