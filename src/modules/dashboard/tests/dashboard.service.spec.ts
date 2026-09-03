import { DashboardService } from '../services/dashboard.service';

describe('DashboardService', () => {
  const repository = {
    contarClientesAtivos: jest.fn(),
    contarUsuariosClienteAtivos: jest.fn(),
    contarFotosProcessadas: jest.fn(),
    calcularTaxaSucesso: jest.fn(),
    listarAtividadesRecentes: jest.fn(),
  };
  const activityLogRepo = { listar: jest.fn() };

  let service: DashboardService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DashboardService(repository as never, activityLogRepo as never);
  });

  it('agrega métricas do overview de crachás', async () => {
    repository.contarClientesAtivos.mockResolvedValue(12);
    repository.contarUsuariosClienteAtivos.mockResolvedValue(45);
    repository.contarFotosProcessadas.mockResolvedValue(3200);
    repository.calcularTaxaSucesso.mockResolvedValue(87.5);
    repository.listarAtividadesRecentes.mockResolvedValue([
      {
        tipo: 'remessa_criada',
        descricao: 'Nova remessa #1001 criada por Cliente ABC.',
        created_at: '2026-09-01T10:00:00.000Z',
      },
      {
        tipo: 'fotos_enviadas',
        descricao: 'Lote com 50 fotos enviado para remessa #1001.',
        created_at: '2026-09-01T09:30:00.000Z',
      },
    ]);

    const result = await service.overview();

    expect(result).toEqual({
      clientes_ativos: 12,
      usuarios_cliente_ativos: 45,
      fotos_processadas: 3200,
      taxa_sucesso: 87.5,
      atividades_recentes: [
        {
          tipo: 'remessa_criada',
          descricao: 'Nova remessa #1001 criada por Cliente ABC.',
          created_at: '2026-09-01T10:00:00.000Z',
        },
        {
          tipo: 'fotos_enviadas',
          descricao: 'Lote com 50 fotos enviado para remessa #1001.',
          created_at: '2026-09-01T09:30:00.000Z',
        },
      ],
    });
  });

  it('retorna zeros quando não há dados', async () => {
    repository.contarClientesAtivos.mockResolvedValue(0);
    repository.contarUsuariosClienteAtivos.mockResolvedValue(0);
    repository.contarFotosProcessadas.mockResolvedValue(0);
    repository.calcularTaxaSucesso.mockResolvedValue(0);
    repository.listarAtividadesRecentes.mockResolvedValue([]);

    const result = await service.overview();

    expect(result.clientes_ativos).toBe(0);
    expect(result.fotos_processadas).toBe(0);
    expect(result.taxa_sucesso).toBe(0);
    expect(result.atividades_recentes).toEqual([]);
  });

  it('lista atividades com paginação mapeada', async () => {
    const createdAt = new Date('2026-09-01T12:00:00.000Z');
    activityLogRepo.listar.mockResolvedValue({
      data: [
        {
          id: BigInt(1),
          userId: BigInt(10),
          userNome: 'Operador',
          userTipo: 'user',
          evento: 'remessa.solicitar',
          metodo: 'POST',
          rota: '/remessas/solicitar',
          statusCode: 201,
          ip: '127.0.0.1',
          userAgent: 'jest',
          payload: null,
          createdAt,
        },
      ],
      pagination: { page: 1, perPage: 20, total: 1 },
    });

    const result = await service.listarAtividades({ page: 1 });

    expect(result.data[0]).toMatchObject({
      id: BigInt(1),
      evento: 'remessa.solicitar',
      rota: '/remessas/solicitar',
      status_code: 201,
    });
    expect(result.pagination).toEqual({ page: 1, perPage: 20, total: 1 });
  });
});
