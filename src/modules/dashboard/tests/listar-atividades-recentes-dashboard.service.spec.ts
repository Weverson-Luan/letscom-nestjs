import { Test } from '@nestjs/testing';
import { DashboardRepository } from '../repositories/dashboard.repository';
import { ListarAtividadesRecentesDashboardService } from '../services/listar-atividades-recentes-dashboard.service';

describe('ListarAtividadesRecentesDashboardService', () => {
  const repository = { paginarAtividadesRecentes: jest.fn() };
  let service: ListarAtividadesRecentesDashboardService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const modulo = await Test.createTestingModule({
      providers: [
        ListarAtividadesRecentesDashboardService,
        { provide: DashboardRepository, useValue: repository },
      ],
    }).compile();
    service = modulo.get(ListarAtividadesRecentesDashboardService);
  });

  it('pagina no repository e monta as descrições', async () => {
    repository.paginarAtividadesRecentes.mockResolvedValue({
      data: [
        {
          tipo: 'remessa_criada',
          numero: 1001n,
          status: null,
          nome: 'Cliente ABC',
          quantidade: null,
          created_at: new Date('2026-09-01T10:00:00.000Z'),
        },
        {
          tipo: 'fotos_enviadas',
          numero: 1001n,
          status: null,
          nome: null,
          quantidade: 50n,
          created_at: new Date('2026-09-01T09:30:00.000Z'),
        },
      ],
      total: 12,
    });

    const resultado = await service.execute({ page: 1, per_page: 10 });

    expect(repository.paginarAtividadesRecentes).toHaveBeenCalledWith(0, 10);
    expect(resultado).toEqual({
      data: [
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
      pagination: { current_page: 1, last_page: 2, per_page: 10, total: 12 },
    });
  });

  it('calcula o offset a partir da página', async () => {
    repository.paginarAtividadesRecentes.mockResolvedValue({ data: [], total: 120 });

    await service.execute({ page: 3, per_page: 25 });

    expect(repository.paginarAtividadesRecentes).toHaveBeenCalledWith(50, 25);
  });

  it('devolve lista vazia com paginação correta além da última página', async () => {
    repository.paginarAtividadesRecentes.mockResolvedValue({ data: [], total: 12 });

    const resultado = await service.execute({ page: 5, per_page: 10 });

    expect(repository.paginarAtividadesRecentes).toHaveBeenCalledWith(40, 10);
    expect(resultado).toEqual({
      data: [],
      pagination: { current_page: 5, last_page: 2, per_page: 10, total: 12 },
    });
  });

  it('devolve last_page 1 quando não há atividades', async () => {
    repository.paginarAtividadesRecentes.mockResolvedValue({ data: [], total: 0 });

    const resultado = await service.execute({ page: 1, per_page: 10 });

    expect(resultado.pagination).toEqual({ current_page: 1, last_page: 1, per_page: 10, total: 0 });
  });
});
