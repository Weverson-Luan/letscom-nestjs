/**
 * IMPORTS
 */
import { Prisma } from '@prisma/client';

// shared / prisma (conexão com o banco)
import { PrismaService } from 'src/shared/prisma/prisma.service';

// repositories
import { UsuarioInternoComPapelRepository } from '../repositories/usuario-interno-com-papel.repository';

// fixtures do módulo (usuário do Prisma)
import { criarUsuarioFake } from './fixtures';

describe('UsuarioInternoComPapelRepository', () => {
  const prisma = { $queryRaw: jest.fn(), user: { findUnique: jest.fn() } };
  const repository = new UsuarioInternoComPapelRepository(prisma as unknown as PrismaService);

  function sqlDaChamada(indice: number): Prisma.Sql {
    const [template, ...valores] = prisma.$queryRaw.mock.calls[indice];
    return Prisma.sql(template, ...valores);
  }

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.user.findUnique.mockResolvedValue(criarUsuarioFake());
  });

  it('busca por id com o filtro de usuário interno e devolve o papel', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([{ id: 12n, papel: 'PRODUCAO' }]);

    await expect(repository.buscarPorId(12n)).resolves.toEqual({
      usuario: criarUsuarioFake(),
      papel: 'producao',
    });
    expect(sqlDaChamada(0).sql).toContain('NOT EXISTS');
    expect(sqlDaChamada(0).sql).toContain('AND u.id = ?');
    expect(sqlDaChamada(0).values).toContain(12n);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 12n } });
  });

  it('devolve null sem consultar o usuário quando não é usuário interno', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([]);

    await expect(repository.buscarPorId(99n)).resolves.toBeNull();
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});
