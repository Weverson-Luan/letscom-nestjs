import { Prisma } from '@prisma/client';
import { DashboardRepository } from '../repositories/dashboard.repository';

describe('DashboardRepository', () => {
  const prisma = {
    remessa: { count: jest.fn() },
    $queryRaw: jest.fn(),
  };
  const roleUserRepo = { countUsersWithRole: jest.fn() };

  let repository: DashboardRepository;

  /** Reconstrói o SQL da n-ésima chamada a $queryRaw (template + valores parametrizados). */
  function sqlDaChamada(indice: number): Prisma.Sql {
    const [template, ...valores] = prisma.$queryRaw.mock.calls[indice];
    return Prisma.sql(template, ...valores);
  }

  /** Normaliza espaços para comparar trechos do SQL. */
  function compactar(sql: string): string {
    return sql.replace(/\s+/g, ' ');
  }

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new DashboardRepository(prisma as never, roleUserRepo as never);
  });

  describe('paginarAtividadesRecentes', () => {
    it('une as 4 fontes numa única query paginada e soma o total das fontes', async () => {
      const linha = {
        tipo: 'status_alterado',
        numero: 52647n,
        status: 'em_producao',
        nome: 'Juliano Vieira',
        quantidade: null,
        created_at: new Date('2026-10-20T10:00:00.000Z'),
      };
      prisma.$queryRaw.mockResolvedValueOnce([linha]).mockResolvedValueOnce([{ total: 37n }]);

      const resultado = await repository.paginarAtividadesRecentes(20, 10);

      expect(resultado).toEqual({ data: [linha], total: 37 });
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);

      const lista = sqlDaChamada(0);
      const sql = compactar(lista.sql);
      expect(sql.match(/UNION ALL/g)).toHaveLength(3);
      expect(sql).toContain("SELECT 'remessa_criada'");
      expect(sql).toContain("SELECT 'status_alterado'");
      expect(sql).toContain("SELECT 'fotos_enviadas'");
      expect(sql).toContain("SELECT 'cliente_cadastrado'");
      expect(sql).toContain(
        'ORDER BY atividades.created_at DESC, atividades.ordem ASC, atividades.referencia_id DESC',
      );
      expect(sql).toContain('LIMIT ? OFFSET ?');
      // cada fonte corta em skip + take (30) antes do sort externo; depois LIMIT take OFFSET skip
      expect(sql.match(/LIMIT \?\)/g)).toHaveLength(4);
      expect(lista.values).toEqual([30, 30, 30, 30, 10, 20]);
    });

    it('mantém os filtros de cada fonte', async () => {
      prisma.$queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([{ total: 0n }]);

      await repository.paginarAtividadesRecentes(0, 10);

      const sql = compactar(sqlDaChamada(0).sql);
      // remessas criadas: só não excluídas, com o nome do cliente
      expect(sql).toContain(
        'FROM remessas r LEFT JOIN users c ON c.id = r.cliente_id WHERE r.deleted_at IS NULL ORDER BY',
      );
      // status: sem filtro de remessa excluída, autor via user_id
      expect(sql).toContain(
        'FROM remessas_status rs LEFT JOIN remessas r ON r.id = rs.remessa_id LEFT JOIN users u ON u.id = rs.user_id ORDER BY rs.data_status DESC, rs.id DESC',
      );
      // fotos: lote por remessa com MAX(created_at) e COUNT(*)
      expect(sql).toContain(
        'SELECT remessa_id, MAX(created_at) AS created_at, COUNT(*) AS quantidade FROM remessa_fotos GROUP BY remessa_id',
      );
      // clientes: ativos, não excluídos, com papel cliente ativo
      expect(sql).toContain('u.ativo = 1 AND u.deleted_at IS NULL AND EXISTS');
      expect(sql).toContain("ru.ativo = 1 AND LOWER(papel.nome) = 'cliente'");
    });

    it('calcula o total com as mesmas regras das fontes', async () => {
      prisma.$queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([{ total: 4n }]);

      await repository.paginarAtividadesRecentes(0, 10);

      const sql = compactar(sqlDaChamada(1).sql);
      expect(sql).toContain('(SELECT COUNT(*) FROM remessas WHERE deleted_at IS NULL)');
      expect(sql).toContain('+ (SELECT COUNT(*) FROM remessas_status)');
      expect(sql).toContain('+ (SELECT COUNT(DISTINCT remessa_id) FROM remessa_fotos)');
      expect(sql).toContain(
        '+ (SELECT COUNT(*) FROM users u WHERE u.ativo = 1 AND u.deleted_at IS NULL AND EXISTS',
      );
    });

    it('devolve total zero quando a contagem vem vazia', async () => {
      prisma.$queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      await expect(repository.paginarAtividadesRecentes(0, 10)).resolves.toEqual({
        data: [],
        total: 0,
      });
    });
  });

  it('conta só remessas canceladas não excluídas', async () => {
    prisma.remessa.count.mockResolvedValue(7);

    await expect(repository.contarRemessasCanceladas()).resolves.toBe(7);
    expect(prisma.remessa.count).toHaveBeenCalledWith({
      where: { deletedAt: null, status: 'cancelada' },
    });
  });
});
