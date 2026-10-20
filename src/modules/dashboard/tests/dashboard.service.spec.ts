import { DashboardService } from '../services/dashboard.service';

describe('DashboardService', () => {
  const repository = {
    contarClientesAtivos: jest.fn(),
    contarUsuariosClienteAtivos: jest.fn(),
    contarFotosProcessadas: jest.fn(),
    calcularTaxaSucesso: jest.fn(),
    contarRemessasCanceladas: jest.fn(),
    listarAtividadesRecentes: jest.fn(),
  };

  let service: DashboardService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DashboardService(repository as never);
  });

  it('agrega métricas do overview de crachás', async () => {
    repository.contarClientesAtivos.mockResolvedValue(12);
    repository.contarUsuariosClienteAtivos.mockResolvedValue(45);
    repository.contarFotosProcessadas.mockResolvedValue(3200);
    repository.calcularTaxaSucesso.mockResolvedValue(87.5);
    repository.contarRemessasCanceladas.mockResolvedValue(4);
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
      remessas_canceladas: 4,
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
    repository.contarRemessasCanceladas.mockResolvedValue(0);
    repository.listarAtividadesRecentes.mockResolvedValue([]);

    const result = await service.overview();

    expect(result.clientes_ativos).toBe(0);
    expect(result.fotos_processadas).toBe(0);
    expect(result.taxa_sucesso).toBe(0);
    expect(result.remessas_canceladas).toBe(0);
    expect(result.atividades_recentes).toEqual([]);
  });
});
