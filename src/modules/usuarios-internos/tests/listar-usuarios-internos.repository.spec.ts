/**
 * IMPORTS
 */
import { Prisma } from '@prisma/client';

// shared / prisma (conexão com o banco)
import { PrismaService } from 'src/shared/prisma/prisma.service';

// repositories
import { ListarUsuariosInternosRepository } from '../repositories/listar-usuarios-internos.repository';

// fixtures do módulo (usuário do Prisma)
import { criarUsuarioFake } from './fixtures';

describe('ListarUsuariosInternosRepository', () => {
  const prisma = { $queryRaw: jest.fn(), user: { findMany: jest.fn() } };
  const repository = new ListarUsuariosInternosRepository(prisma as unknown as PrismaService);

  function sqlDaChamada(indice: number): Prisma.Sql {
    const [template, ...valores] = prisma.$queryRaw.mock.calls[indice];
    return Prisma.sql(template, ...valores);
  }

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.user.findMany.mockResolvedValue([criarUsuarioFake()]);
  });

  it('pagina com o filtro de usuário interno e carrega os usuários das linhas', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([{ id: 12n, papel: 'CONSULTOR' }]);
    prisma.$queryRaw.mockResolvedValueOnce([{ total: 1n }]);

    const resultado = await repository.paginar({ skip: 0, take: 10 });

    expect(sqlDaChamada(0).sql).toContain('NOT EXISTS');
    expect(sqlDaChamada(0).sql).toContain('ORDER BY u.created_at DESC, u.id DESC');
    expect(sqlDaChamada(1).sql).toContain('COUNT(DISTINCT u.id)');
    expect(prisma.user.findMany).toHaveBeenCalledWith({ where: { id: { in: [12n] } } });
    expect(resultado).toEqual({
      data: [{ usuario: criarUsuarioFake(), papel: 'consultor' }],
      total: 1,
    });
  });

  it('aplica busca e papel na listagem e na contagem, sem consultar usuários quando vazio', async () => {
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
});
