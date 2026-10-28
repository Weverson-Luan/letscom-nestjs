import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { ListarConsultoresRepository } from '../repositories/listar-consultores.repository';

describe('ListarConsultoresRepository', () => {
  const prisma = { $queryRaw: jest.fn(), user: { findMany: jest.fn() } };
  const repository = new ListarConsultoresRepository(prisma as unknown as PrismaService);

  function sqlDaChamada(indice = 0) {
    const [template, ...valores] = prisma.$queryRaw.mock.calls[indice];
    return Prisma.sql(template, ...valores);
  }

  beforeEach(() => jest.clearAllMocks());

  it('pagina consultores e admins com total', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([{ id: 3n }]).mockResolvedValueOnce([{ total: 1n }]);
    prisma.user.findMany.mockResolvedValue([{ id: 3n }]);

    const resultado = await repository.paginar({ skip: 10, take: 10 });

    expect(resultado).toEqual({ data: [{ id: 3n }], total: 1 });
    const sql = sqlDaChamada(0);
    expect(sql.sql).toContain("LOWER(r.nome) LIKE '%consultor%'");
    expect(sql.sql).toContain('ORDER BY u.created_at DESC');
    expect(sql.values).toEqual([10, 10]);
    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: { id: { in: [3n] } },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('filtra por nome e não consulta usuários quando a página é vazia', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([{ total: 0n }]);

    const resultado = await repository.paginar({ search: 'ana', skip: 0, take: 10 });

    expect(resultado).toEqual({ data: [], total: 0 });
    expect(prisma.user.findMany).not.toHaveBeenCalled();
    expect(sqlDaChamada(0).values).toEqual(['%ana%', 10, 0]);
  });
});
