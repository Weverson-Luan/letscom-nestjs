import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { ClienteResumoAnotacoesRepository } from '../repositories/cliente-resumo-anotacoes.repository';
import { criarLinhaResumoFake } from './fixtures';

describe('ClienteResumoAnotacoesRepository', () => {
  const prisma = { $queryRaw: jest.fn() };
  const repository = new ClienteResumoAnotacoesRepository(prisma as unknown as PrismaService);

  function sqlDaChamada(indice: number): Prisma.Sql {
    const [template, ...valores] = prisma.$queryRaw.mock.calls[indice];
    return Prisma.sql(template, ...valores);
  }

  beforeEach(() => jest.clearAllMocks());

  it('lista clientes ativos com contagem de anotações não excluídas e ordena pelo último contato', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([criarLinhaResumoFake()]);
    prisma.$queryRaw.mockResolvedValueOnce([{ total: 1n }]);

    const resultado = await repository.paginar({ search: 'empresa', skip: 10, take: 10 });

    const listagem = sqlDaChamada(0);
    expect(listagem.sql).toContain('a.deleted_at IS NULL');
    expect(listagem.sql).toContain('LOWER(r.nome) = ?');
    expect(listagem.sql).toContain('ORDER BY MAX(a.created_at) IS NULL, MAX(a.created_at) DESC');
    expect(listagem.values).toEqual(expect.arrayContaining(['cliente', '%empresa%', 10]));
    expect(sqlDaChamada(1).sql).toContain('COUNT(DISTINCT u.id)');
    expect(resultado).toEqual({ data: [criarLinhaResumoFake()], total: 1 });
  });

  it('escapa curingas do LIKE digitados na busca', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([]);
    prisma.$queryRaw.mockResolvedValueOnce([{ total: 0n }]);

    await repository.paginar({ search: '50%_off', skip: 0, take: 10 });

    expect(sqlDaChamada(0).values).toContain('%50\\%\\_off%');
  });

  it('busca por id devolve null quando não encontra', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([]);

    await expect(repository.buscarPorId(5n)).resolves.toBeNull();
    expect(sqlDaChamada(0).values).toContain(5n);
  });
});
