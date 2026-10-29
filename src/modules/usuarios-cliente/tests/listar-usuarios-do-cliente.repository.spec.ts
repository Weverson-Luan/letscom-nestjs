import { PrismaService } from 'src/shared/prisma/prisma.service';
import { ListarUsuariosDoClienteRepository } from '../repositories/listar-usuarios-do-cliente.repository';

describe('ListarUsuariosDoClienteRepository', () => {
  const prisma = {
    $transaction: jest.fn(),
    userCliente: { findMany: jest.fn(), count: jest.fn() },
  };
  const repository = new ListarUsuariosDoClienteRepository(prisma as unknown as PrismaService);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.userCliente.findMany.mockReturnValue('consulta');
    prisma.userCliente.count.mockReturnValue('contagem');
    prisma.$transaction.mockResolvedValue([[{ id: 1n }], 1]);
  });

  it('filtra pelo cliente e ordena por created_at desc por padrão', async () => {
    const resultado = await repository.paginarPorCliente({ clienteId: 9n, skip: 0, take: 10 });

    expect(resultado).toEqual({ data: [{ id: 1n }], total: 1 });
    expect(prisma.userCliente.findMany).toHaveBeenCalledWith({
      where: { clienteId: 9n },
      orderBy: { createdAt: 'desc' },
      skip: 0,
      take: 10,
    });
    expect(prisma.userCliente.count).toHaveBeenCalledWith({ where: { clienteId: 9n } });
    expect(prisma.$transaction).toHaveBeenCalledWith(['consulta', 'contagem']);
  });

  it('busca por email, nome e documento', async () => {
    await repository.paginarPorCliente({ clienteId: 9n, busca: 'abc', skip: 0, take: 10 });

    expect(prisma.userCliente.count).toHaveBeenCalledWith({
      where: {
        clienteId: 9n,
        OR: [
          { email: { contains: 'abc' } },
          { nome: { contains: 'abc' } },
          { documento: { contains: 'abc' } },
        ],
      },
    });
  });

  it('usa só campos da whitelist na ordenação', async () => {
    await repository.paginarPorCliente({
      clienteId: 9n,
      campoOrdenacao: 'senha',
      direcao: 'asc',
      skip: 0,
      take: 10,
    });
    await repository.paginarPorCliente({
      clienteId: 9n,
      campoOrdenacao: 'updated_at',
      direcao: 'asc',
      skip: 0,
      take: 10,
    });

    expect(prisma.userCliente.findMany.mock.calls[0][0].orderBy).toEqual({ createdAt: 'asc' });
    expect(prisma.userCliente.findMany.mock.calls[1][0].orderBy).toEqual({ updatedAt: 'asc' });
  });
});
