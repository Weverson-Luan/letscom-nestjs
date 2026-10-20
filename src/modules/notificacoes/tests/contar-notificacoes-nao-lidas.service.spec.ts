import { Test } from '@nestjs/testing';
import { NotificacaoRepository } from '../repositories/notificacao.repository';
import { ContarNotificacoesNaoLidasService } from '../services/contar-notificacoes-nao-lidas.service';
import { criarUsuarioFake } from './fixtures';

describe('ContarNotificacoesNaoLidasService', () => {
  const repository = { contarNaoLidas: jest.fn() };
  let service: ContarNotificacoesNaoLidasService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ContarNotificacoesNaoLidasService,
        { provide: NotificacaoRepository, useValue: repository },
      ],
    }).compile();
    service = moduleRef.get(ContarNotificacoesNaoLidasService);
  });

  it('conta as não lidas da caixa do usuário', async () => {
    repository.contarNaoLidas.mockResolvedValue(3);

    await expect(service.execute(criarUsuarioFake())).resolves.toEqual({ nao_lidas: 3 });
    expect(repository.contarNaoLidas).toHaveBeenCalledWith({ destinatarioUserId: 7n });
  });
});
