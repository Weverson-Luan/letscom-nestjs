import { RemessasCacheService } from '../services/remessas-cache.service';

describe('RemessasCacheService.invalidarTudoDosClientes', () => {
  const cache = { bumpVersion: jest.fn(), getVersion: jest.fn(), md5: jest.fn() };
  let service: RemessasCacheService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RemessasCacheService(cache as never);
  });

  it('sobe as versões globais uma vez e as por cliente uma vez por cliente distinto', async () => {
    await service.invalidarTudoDosClientes([7, 7, 9]);

    const chaves = cache.bumpVersion.mock.calls.map(([chave]) => chave).sort();
    expect(chaves).toEqual(
      [
        'remessas_minhas_tarefas_ver',
        'remessas_tarefas_disponiveis_ver',
        'remessas_tarefas_expedicao_ver',
        'remessas_tarefas_balcao_ver',
        'remessas_andamento_ver:7',
        'remessas_historico_ver:7',
        'remessas_andamento_ver:9',
        'remessas_historico_ver:9',
      ].sort(),
    );
  });
});
