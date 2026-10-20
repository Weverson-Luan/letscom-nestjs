import { Test } from '@nestjs/testing';
import { NotificacaoRepository } from '../repositories/notificacao.repository';
import { ListarNotificacoesService } from '../services/listar-notificacoes.service';
import { criarNotificacaoFake, criarUsuarioFake } from './fixtures';

describe('ListarNotificacoesService', () => {
  const repository = { paginar: jest.fn(), contarNaoLidas: jest.fn() };
  let service: ListarNotificacoesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ListarNotificacoesService,
        { provide: NotificacaoRepository, useValue: repository },
      ],
    }).compile();
    service = moduleRef.get(ListarNotificacoesService);
    repository.paginar.mockResolvedValue({ data: [criarNotificacaoFake()], total: 11 });
    repository.contarNaoLidas.mockResolvedValue(4);
  });

  it('pagina a caixa do usuário e devolve o total de não lidas', async () => {
    const resultado = await service.execute({ page: '2' }, criarUsuarioFake());

    expect(repository.paginar).toHaveBeenCalledWith({
      filtro: { destinatarioUserId: 7n },
      apenasNaoLidas: false,
      skip: 10,
      take: 10,
    });
    expect(repository.contarNaoLidas).toHaveBeenCalledWith({ destinatarioUserId: 7n });
    expect(resultado).toMatchObject({
      data: [expect.objectContaining({ id: 50n, lida: false })],
      pagination: { current_page: 2, last_page: 2, per_page: 10, total: 11 },
      nao_lidas: 4,
    });
  });

  it('filtra só não lidas e usa a caixa do subordinado', async () => {
    await service.execute(
      { apenas_nao_lidas: 'true' },
      criarUsuarioFake({ id: 3n, tipoLogin: 'subordinado' }),
    );

    expect(repository.paginar).toHaveBeenCalledWith(
      expect.objectContaining({ filtro: { destinatarioSubordinadoId: 3n }, apenasNaoLidas: true }),
    );
  });

  it('devolve lista vazia', async () => {
    repository.paginar.mockResolvedValue({ data: [], total: 0 });
    repository.contarNaoLidas.mockResolvedValue(0);

    await expect(service.execute({ apenas_nao_lidas: '0' }, criarUsuarioFake())).resolves.toEqual({
      data: [],
      pagination: { current_page: 1, last_page: 1, per_page: 10, total: 0 },
      nao_lidas: 0,
    });
  });
});
