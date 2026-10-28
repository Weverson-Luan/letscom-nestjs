import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { ResponsavelCompromissoRepository } from '../repositories/responsavel-compromisso.repository';

describe('ResponsavelCompromissoRepository', () => {
  const prisma = { $queryRaw: jest.fn(), userCliente: { findFirst: jest.fn() } };
  const repository = new ResponsavelCompromissoRepository(prisma as unknown as PrismaService);

  function sqlDaChamada(indice = 0) {
    const [template, ...valores] = prisma.$queryRaw.mock.calls[indice];
    return Prisma.sql(template, ...valores);
  }

  beforeEach(() => jest.clearAllMocks());

  it('considera interno ativo só usuário ativo, não excluído e com papel interno ativo', async () => {
    prisma.$queryRaw.mockResolvedValue([{ id: 8n }]);

    await expect(repository.ehUsuarioInternoAtivo(8n)).resolves.toBe(true);

    const sql = sqlDaChamada();
    expect(sql.sql).toContain('u.ativo = 1');
    expect(sql.sql).toContain('u.deleted_at IS NULL');
    expect(sql.sql).toContain('ru.ativo = 1');
    expect(sql.values).toEqual([8n, 'admin', 'consultor', 'producao', 'recepcao', 'expedicao']);
  });

  it('devolve false quando não é interno ativo', async () => {
    prisma.$queryRaw.mockResolvedValue([]);
    await expect(repository.ehUsuarioInternoAtivo(5n)).resolves.toBe(false);
  });

  it('subordinado só vale se for ativo e do mesmo cliente', async () => {
    prisma.userCliente.findFirst.mockResolvedValueOnce({ id: 3n }).mockResolvedValueOnce(null);

    await expect(repository.ehSubordinadoAtivoDoCliente(5n, 3n)).resolves.toBe(true);
    await expect(repository.ehSubordinadoAtivoDoCliente(5n, 4n)).resolves.toBe(false);
    expect(prisma.userCliente.findFirst).toHaveBeenCalledWith({
      where: { id: 3n, clienteId: 5n, ativo: true },
      select: { id: true },
    });
  });

  it('pagina equipe, cliente e subordinados sem busca, com total', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([{ total: 3n }]);

    const resultado = await repository.paginar({ clienteId: 5n, skip: 20, take: 20 });

    expect(resultado).toEqual({ data: [], total: 3 });
    const sql = sqlDaChamada(0);
    expect(sql.sql).toContain("'interno'");
    expect(sql.sql).toContain('FROM users_cliente uc');
    expect(sql.sql).toContain('ORDER BY t.ordem ASC, COALESCE(t.nome, t.email) ASC, t.id ASC');
    expect(sql.sql).not.toContain('LIKE');
    expect(sql.values).toEqual([
      5n,
      'admin',
      'consultor',
      'producao',
      'recepcao',
      'expedicao',
      5n,
      5n,
      20,
      20,
    ]);
    expect(sqlDaChamada(1).sql).toContain('COUNT(*)');
  });

  it('busca por nome/e-mail escapando curingas e por documento só com dígitos', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([{ total: 0n }]);

    await repository.paginar({ clienteId: 5n, search: '123.456_%', skip: 0, take: 20 });

    const sql = sqlDaChamada(0);
    expect(sql.sql).toContain('t.nome LIKE ?');
    expect(sql.sql).toContain('t.documento LIKE ?');
    expect(sql.values.slice(-5)).toEqual(['%123.456\\_\\%%', '%123.456\\_\\%%', '%123456%', 20, 0]);
  });

  it('busca sem dígitos não filtra por documento', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    const resultado = await repository.paginar({ clienteId: 5n, search: 'ana', skip: 0, take: 20 });

    expect(resultado.total).toBe(0);
    expect(sqlDaChamada(0).sql).not.toContain('t.documento LIKE');
  });
});
