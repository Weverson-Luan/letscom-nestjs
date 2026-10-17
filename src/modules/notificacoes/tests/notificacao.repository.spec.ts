import { PrismaService } from 'src/shared/prisma/prisma.service';
import { NotificacaoRepository } from '../repositories/notificacao.repository';

describe('NotificacaoRepository', () => {
  const prisma = {
    notificacao: {
      createMany: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };
  const repository = new NotificacaoRepository(prisma as unknown as PrismaService);

  beforeEach(() => jest.clearAllMocks());

  it('pagina da mais recente para a mais antiga, filtrando não lidas quando pedido', async () => {
    prisma.notificacao.findMany.mockResolvedValue([]);
    prisma.notificacao.count.mockResolvedValue(0);

    await repository.paginar({
      filtro: { destinatarioUserId: 7n },
      apenasNaoLidas: true,
      skip: 10,
      take: 10,
    });

    const where = { destinatarioUserId: 7n, lidaEm: null };
    expect(prisma.notificacao.findMany).toHaveBeenCalledWith({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: 10,
      take: 10,
    });
    expect(prisma.notificacao.count).toHaveBeenCalledWith({ where });
  });

  it('busca só dentro da caixa do destinatário', async () => {
    await repository.buscarDoDestinatario(50n, { destinatarioSubordinadoId: 3n });

    expect(prisma.notificacao.findFirst).toHaveBeenCalledWith({
      where: { id: 50n, destinatarioSubordinadoId: 3n },
    });
  });

  it('marca todas as não lidas do destinatário e usa tx nas escritas', async () => {
    const tx = { notificacao: { updateMany: jest.fn(), createMany: jest.fn() } };

    await repository.marcarTodasLidas({ destinatarioUserId: 7n }, tx as never);
    await repository.criarVarias([], tx as never);

    expect(tx.notificacao.updateMany).toHaveBeenCalledWith({
      where: { destinatarioUserId: 7n, lidaEm: null },
      data: { lidaEm: expect.any(Date) },
    });
    expect(tx.notificacao.createMany).toHaveBeenCalledWith({ data: [] });
    expect(prisma.notificacao.updateMany).not.toHaveBeenCalled();
  });

  it('conta só as não lidas', async () => {
    await repository.contarNaoLidas({ destinatarioUserId: 7n });

    expect(prisma.notificacao.count).toHaveBeenCalledWith({
      where: { destinatarioUserId: 7n, lidaEm: null },
    });
  });
});
