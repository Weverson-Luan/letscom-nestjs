import { DashboardRepository } from '../repositories/dashboard.repository';

describe('DashboardRepository.listarAtividadesRecentes', () => {
  const prisma = {
    remessa: { findMany: jest.fn() },
    remessaStatus: { findMany: jest.fn() },
    user: { findMany: jest.fn() },
    $queryRaw: jest.fn(),
  };
  const roleUserRepo = { findRecentClientUserIds: jest.fn() };

  let repository: DashboardRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.remessa.findMany.mockResolvedValue([]);
    prisma.$queryRaw.mockResolvedValue([]);
    roleUserRepo.findRecentClientUserIds.mockResolvedValue([]);
    repository = new DashboardRepository(prisma as never, roleUserRepo as never);
  });

  it('mostra quem avançou a remessa quando o autor foi gravado', async () => {
    prisma.remessaStatus.findMany.mockResolvedValue([
      {
        remessaId: BigInt(1),
        status: 'em_producao',
        dataStatus: new Date('2026-10-20T10:00:00.000Z'),
        remessa: { id: BigInt(1), numeroRemessa: BigInt(52647) },
        usuario: { nome: 'Juliano Vieira' },
      },
    ]);

    const atividades = await repository.listarAtividadesRecentes(10);

    expect(atividades).toEqual([
      {
        tipo: 'status_alterado',
        descricao: 'Remessa #52647 avançou para em_producao por Juliano Vieira.',
        created_at: '2026-10-20T10:00:00.000Z',
      },
    ]);
    expect(prisma.remessaStatus.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({ usuario: { select: { nome: true } } }),
      }),
    );
  });

  it('mantém a descrição sem autor no histórico legado', async () => {
    prisma.remessaStatus.findMany.mockResolvedValue([
      {
        remessaId: BigInt(1),
        status: 'conferido',
        dataStatus: new Date('2026-10-20T10:00:00.000Z'),
        remessa: { id: BigInt(1), numeroRemessa: BigInt(52647) },
        usuario: null,
      },
    ]);

    const [atividade] = await repository.listarAtividadesRecentes(10);

    expect(atividade.descricao).toBe('Remessa #52647 avançou para conferido.');
  });
});
