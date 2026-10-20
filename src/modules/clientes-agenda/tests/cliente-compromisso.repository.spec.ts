import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { ClienteCompromissoRepository } from '../repositories/cliente-compromisso.repository';

describe('ClienteCompromissoRepository', () => {
  const prisma = {
    $queryRaw: jest.fn(),
    clienteCompromisso: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };
  const repository = new ClienteCompromissoRepository(prisma as unknown as PrismaService);
  const include = {
    autor: { select: { id: true, nome: true } },
    responsavel: { select: { id: true, nome: true } },
    responsavelSubordinado: { select: { id: true, nome: true, email: true } },
  };

  beforeEach(() => jest.clearAllMocks());

  it('considera cliente só usuário não excluído com papel cliente ativo', async () => {
    prisma.$queryRaw.mockResolvedValue([{ id: 5n }]);

    await expect(repository.ehClienteAtivo(5n)).resolves.toBe(true);

    const [template, ...valores] = prisma.$queryRaw.mock.calls[0];
    const sql = Prisma.sql(template, ...valores);
    expect(sql.sql).toContain('u.deleted_at IS NULL');
    expect(sql.sql).toContain('ru.ativo = 1');
    expect(sql.values).toEqual([5n, 'cliente']);
  });

  it('devolve false quando não encontra o cliente', async () => {
    prisma.$queryRaw.mockResolvedValue([]);
    await expect(repository.ehClienteAtivo(5n)).resolves.toBe(false);
  });

  it('pagina só o cliente, sem excluídos, por agendado_para asc e id asc', async () => {
    prisma.clienteCompromisso.findMany.mockResolvedValue([]);
    prisma.clienteCompromisso.count.mockResolvedValue(0);

    await expect(repository.paginar({ clienteId: 5n, skip: 0, take: 20 })).resolves.toEqual({
      data: [],
      total: 0,
    });

    const where = { clienteId: 5n, deletedAt: null };
    expect(prisma.clienteCompromisso.findMany).toHaveBeenCalledWith({
      where,
      include,
      orderBy: [{ agendadoPara: 'asc' }, { id: 'asc' }],
      skip: 0,
      take: 20,
    });
    expect(prisma.clienteCompromisso.count).toHaveBeenCalledWith({ where });
  });

  it('aplica todos os filtros, inclusive só visíveis ao cliente', async () => {
    prisma.clienteCompromisso.findMany.mockResolvedValue([]);
    prisma.clienteCompromisso.count.mockResolvedValue(0);
    const de = new Date('2026-10-01T00:00:00.000Z');
    const ate = new Date('2026-10-31T23:59:59.999Z');

    await repository.paginar({
      clienteId: 5n,
      somenteVisiveisCliente: true,
      status: 'pendente',
      tipo: 'visita',
      de,
      ate,
      search: 'proposta',
      skip: 20,
      take: 20,
    });

    expect(prisma.clienteCompromisso.count).toHaveBeenCalledWith({
      where: {
        clienteId: 5n,
        deletedAt: null,
        visivelCliente: true,
        status: 'pendente',
        tipo: 'visita',
        agendadoPara: { gte: de, lte: ate },
        OR: [{ titulo: { contains: 'proposta' } }, { descricao: { contains: 'proposta' } }],
      },
    });
  });

  it('período só com "de" filtra apenas o início', async () => {
    prisma.clienteCompromisso.findMany.mockResolvedValue([]);
    prisma.clienteCompromisso.count.mockResolvedValue(0);
    const de = new Date('2026-10-01T00:00:00.000Z');

    await repository.paginar({ clienteId: 5n, de, skip: 0, take: 20 });

    expect(prisma.clienteCompromisso.count).toHaveBeenCalledWith({
      where: { clienteId: 5n, deletedAt: null, agendadoPara: { gte: de } },
    });
  });

  it('busca por id restrita ao cliente e usa a transação quando informada', async () => {
    const tx = { clienteCompromisso: { findFirst: jest.fn() } };

    await repository.buscarPorId(5n, 1n, tx as unknown as Prisma.TransactionClient);

    expect(tx.clienteCompromisso.findFirst).toHaveBeenCalledWith({
      where: { id: 1n, clienteId: 5n, deletedAt: null },
      include,
    });
    expect(prisma.clienteCompromisso.findFirst).not.toHaveBeenCalled();
  });

  it('cria e atualiza devolvendo as relações', async () => {
    const dados = {
      clienteId: 5n,
      autorId: 7n,
      titulo: 'x',
      agendadoPara: new Date('2026-10-21T14:00:00.000Z'),
    };

    await repository.criar(dados);
    await repository.atualizar(1n, { titulo: 'y' });

    expect(prisma.clienteCompromisso.create).toHaveBeenCalledWith({ data: dados, include });
    expect(prisma.clienteCompromisso.update).toHaveBeenCalledWith({
      where: { id: 1n },
      data: { titulo: 'y' },
      include,
    });
  });

  it('remove de forma lógica preenchendo deleted_at', async () => {
    await repository.remover(1n);

    expect(prisma.clienteCompromisso.update).toHaveBeenCalledWith({
      where: { id: 1n },
      data: { deletedAt: expect.any(Date) },
    });
  });
});
