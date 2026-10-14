import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { UsuarioInternoRepository } from '../repositories/usuario-interno.repository';
import { criarUsuarioFake } from './fixtures';

describe('UsuarioInternoRepository', () => {
  const prisma = {
    $queryRaw: jest.fn(),
    user: { findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
    role: { findUnique: jest.fn() },
  };
  const repository = new UsuarioInternoRepository(prisma as unknown as PrismaService);

  function sqlDaChamada(indice: number): Prisma.Sql {
    const [template, ...valores] = prisma.$queryRaw.mock.calls[indice];
    return Prisma.sql(template, ...valores);
  }

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.user.findMany.mockResolvedValue([criarUsuarioFake()]);
  });

  it('só considera papéis internos e exclui quem tem outro papel ativo', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([{ id: 12n, papel: 'CONSULTOR' }]);
    prisma.$queryRaw.mockResolvedValueOnce([{ total: 1n }]);

    const resultado = await repository.paginar({ skip: 0, take: 10 });

    const sql = sqlDaChamada(0);
    expect(sql.sql).toContain('u.deleted_at IS NULL');
    expect(sql.sql).toContain('LOWER(r.nome) IN (?,?,?)');
    expect(sql.sql).toContain('NOT EXISTS');
    expect(sql.sql).toContain('LOWER(r2.nome) NOT IN (?,?,?)');
    expect(sql.values).toEqual(expect.arrayContaining(['consultor', 'producao', 'recepcao']));
    expect(resultado).toEqual({
      data: [{ usuario: criarUsuarioFake(), papel: 'consultor' }],
      total: 1,
    });
  });

  it('aplica busca e filtro de papel na listagem e na contagem', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([]);
    prisma.$queryRaw.mockResolvedValueOnce([{ total: 0n }]);

    const resultado = await repository.paginar({
      search: 'maria',
      papel: 'recepcao',
      skip: 20,
      take: 10,
    });

    for (const indice of [0, 1]) {
      const sql = sqlDaChamada(indice);
      expect(sql.sql).toContain('AND LOWER(r.nome) = ?');
      expect(sql.sql).toContain('u.email LIKE ?');
      expect(sql.values).toEqual(expect.arrayContaining(['recepcao', '%maria%']));
    }
    expect(sqlDaChamada(0).values).toEqual(expect.arrayContaining([10, 20]));
    expect(prisma.user.findMany).not.toHaveBeenCalled();
    expect(resultado).toEqual({ data: [], total: 0 });
  });

  it('busca por id devolve null quando não é usuário interno', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([]);

    await expect(repository.buscarPorId(99n)).resolves.toBeNull();
    expect(sqlDaChamada(0).values).toContain(99n);
  });

  it('busca o id do papel pelo nome', async () => {
    prisma.role.findUnique.mockResolvedValue({ id: 3n });

    await expect(repository.buscarIdPapel('producao')).resolves.toEqual({ id: 3n });
    expect(prisma.role.findUnique).toHaveBeenCalledWith({
      where: { nome: 'producao' },
      select: { id: true },
    });
  });
});
