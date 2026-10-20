import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { ConversaMensagemRepository } from '../repositories/conversa-mensagem.repository';

describe('ConversaMensagemRepository', () => {
  const prisma = {
    $queryRaw: jest.fn(),
    user: { findUnique: jest.fn(), findFirst: jest.fn() },
    userCliente: { findMany: jest.fn() },
    clienteConsultor: { findMany: jest.fn() },
    conversaMensagem: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    conversaMensagemAnexo: { createMany: jest.fn(), findFirst: jest.fn() },
  };
  const repository = new ConversaMensagemRepository(prisma as unknown as PrismaService);

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

  it('pagina ignorando excluídas, com filtros e da mais recente para a mais antiga', async () => {
    prisma.conversaMensagem.findMany.mockResolvedValue([]);
    prisma.conversaMensagem.count.mockResolvedValue(0);

    await repository.paginar({ clienteId: 5n, search: 'prazo', skip: 20, take: 20 });

    const where = {
      clienteId: 5n,
      deletedAt: null,
      conteudo: { contains: 'prazo' },
    };
    expect(prisma.conversaMensagem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: 20,
        take: 20,
      }),
    );
    expect(prisma.conversaMensagem.count).toHaveBeenCalledWith({ where });
  });

  it('busca por id restrita ao cliente e usa a transação quando informada', async () => {
    const tx = { conversaMensagem: { findFirst: jest.fn() } };

    await repository.buscarPorId(5n, 30n, tx as unknown as Prisma.TransactionClient);

    expect(tx.conversaMensagem.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 30n, clienteId: 5n, deletedAt: null } }),
    );
    expect(prisma.conversaMensagem.findFirst).not.toHaveBeenCalled();
  });

  it('remove de forma lógica preenchendo deleted_at', async () => {
    await repository.remover(30n);

    expect(prisma.conversaMensagem.update).toHaveBeenCalledWith({
      where: { id: 30n },
      data: { deletedAt: expect.any(Date) },
    });
  });

  it('pagina só a partir de visivelDesde quando informado', async () => {
    prisma.conversaMensagem.findMany.mockResolvedValue([]);
    prisma.conversaMensagem.count.mockResolvedValue(0);
    const visivelDesde = new Date('2026-10-15T09:00:00.000Z');

    await repository.paginar({ clienteId: 5n, visivelDesde, skip: 0, take: 20 });

    expect(prisma.conversaMensagem.count).toHaveBeenCalledWith({
      where: { clienteId: 5n, deletedAt: null, createdAt: { gte: visivelDesde } },
    });
  });

  it('busca anexo só de mensagem a partir de visivelDesde quando informado', async () => {
    const visivelDesde = new Date('2026-10-15T09:00:00.000Z');

    await repository.buscarAnexo(5n, 30n, 40n, visivelDesde);

    expect(prisma.conversaMensagemAnexo.findFirst).toHaveBeenCalledWith({
      where: {
        id: 40n,
        mensagemId: 30n,
        mensagem: { clienteId: 5n, deletedAt: null, createdAt: { gte: visivelDesde } },
      },
    });
  });

  it('busca anexo só de mensagem ativa do mesmo cliente', async () => {
    await repository.buscarAnexo(5n, 30n, 40n);

    expect(prisma.conversaMensagemAnexo.findFirst).toHaveBeenCalledWith({
      where: { id: 40n, mensagemId: 30n, mensagem: { clienteId: 5n, deletedAt: null } },
    });
  });

  it('busca o nome do cliente ou null', async () => {
    prisma.user.findUnique.mockResolvedValueOnce({ nome: 'Empresa X' }).mockResolvedValueOnce(null);

    await expect(repository.buscarNomeCliente(5n)).resolves.toBe('Empresa X');
    await expect(repository.buscarNomeCliente(6n)).resolves.toBeNull();
  });
});
