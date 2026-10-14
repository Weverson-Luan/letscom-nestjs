import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { ExtratoMovimentacaoRepository } from '../repositories/extrato-movimentacao.repository';

describe('ExtratoMovimentacaoRepository — cobrança', () => {
  const prisma = {
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
    extratoMovimentacaoCreditoCliente: { findMany: jest.fn(), count: jest.fn() },
  };
  const repository = new ExtratoMovimentacaoRepository(prisma as unknown as PrismaService);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockResolvedValue([[], 0]);
    prisma.$queryRaw.mockResolvedValue([]);
  });

  function sqlDaConsulta(): Prisma.Sql {
    const [template, ...valores] = prisma.$queryRaw.mock.calls[0];
    return Prisma.sql(template, ...valores);
  }

  it('lista só consumos de remessas não canceladas com produção finalizada', async () => {
    await repository.paginateCobranca({ clienteId: 10n, skip: 0, take: 15 });

    const { where } = prisma.extratoMovimentacaoCreditoCliente.findMany.mock.calls[0][0];
    expect(where.remessa).toMatchObject({
      situacao: { not: 'cancelada' },
      status: { not: 'cancelada' },
      dataFimProducao: { not: null },
    });
  });

  it('soma os totais só de remessas com produção finalizada', async () => {
    await repository.totaisCobranca(10n, {});

    expect(sqlDaConsulta().sql).toContain('r.data_fim_producao IS NOT NULL');
  });

  it('agrupa por produto só remessas com produção finalizada', async () => {
    await repository.totaisCobrancaPorProduto(10n, {});

    expect(sqlDaConsulta().sql).toContain('r.data_fim_producao IS NOT NULL');
  });
});
