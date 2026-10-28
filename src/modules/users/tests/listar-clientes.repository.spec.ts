import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { ListarClientesRepository } from '../repositories/listar-clientes.repository';

describe('ListarClientesRepository', () => {
  const prisma = { $queryRaw: jest.fn(), user: { findMany: jest.fn() } };
  const repository = new ListarClientesRepository(prisma as unknown as PrismaService);

  function sqlDaChamada(indice = 0) {
    const [template, ...valores] = prisma.$queryRaw.mock.calls[indice];
    return Prisma.sql(template, ...valores);
  }

  beforeEach(() => jest.clearAllMocks());

  it('filtra pelo papel cliente e mantém a ordem paginada do SQL', async () => {
    prisma.$queryRaw
      .mockResolvedValueOnce([{ id: 2n }, { id: 1n }])
      .mockResolvedValueOnce([{ total: 2n }]);
    prisma.user.findMany.mockResolvedValue([{ id: 1n }, { id: 2n }]);

    const resultado = await repository.paginar({ skip: 0, take: 10 });

    expect(resultado).toEqual({ data: [{ id: 2n }, { id: 1n }], total: 2 });
    const sql = sqlDaChamada(0);
    expect(sql.sql).toContain('ru.ativo = 1');
    expect(sql.sql).toContain('ORDER BY u.created_at DESC, u.id DESC');
    expect(sql.sql).not.toContain('LIKE');
    expect(sql.values).toEqual(['cliente', 10, 0]);
  });

  it('usa só colunas da whitelist na ordenação', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([{ total: 0n }]);

    await repository.paginar({
      sortBy: 'senha; DROP TABLE users',
      order: 'asc',
      skip: 0,
      take: 10,
    });

    expect(sqlDaChamada(0).sql).toContain('ORDER BY u.created_at ASC, u.id ASC');
  });

  it('busca por nome, email, documento e telefone, e por id quando o termo é numérico', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([{ total: 0n }]);

    const resultado = await repository.paginar({ search: '42', skip: 0, take: 10 });

    expect(resultado).toEqual({ data: [], total: 0 });
    expect(prisma.user.findMany).not.toHaveBeenCalled();
    const sql = sqlDaChamada(0);
    expect(sql.sql).toContain('u.telefone LIKE');
    expect(sql.sql).toContain('OR u.id =');
    expect(sql.values).toEqual(['cliente', '%42%', '%42%', '%42%', '%42%', 42n, 10, 0]);
  });
});
