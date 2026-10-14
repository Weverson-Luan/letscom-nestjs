import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { MENSAGEM_SEM_PERMISSAO } from 'src/shared/auth/features';
import { AuthUser } from 'src/shared/decorators/current-user.decorator';
import { BusinessException } from 'src/shared/exceptions/business.exception';
import { ExtratoMovimentacaoRepository } from '../repositories/extrato-movimentacao.repository';
import { ListarMinhaCobrancaCreditoService } from '../services/listar-minha-cobranca-credito.service';

describe('ListarMinhaCobrancaCreditoService', () => {
  let service: ListarMinhaCobrancaCreditoService;

  const extratoRepo = {
    paginateCobranca: jest.fn(),
    totaisCobranca: jest.fn(),
    totaisCobrancaPorProduto: jest.fn(),
  };

  const cliente: AuthUser = {
    id: 10n,
    email: 'cliente@empresa.com',
    nome: 'Cliente',
    ativo: true,
    tipoLogin: 'user',
    clienteId: null,
    roles: ['cliente'],
  };

  const subordinado: AuthUser = {
    ...cliente,
    id: 99n,
    tipoLogin: 'subordinado',
    clienteId: 10n,
    roles: ['subordinado'],
  };

  const linha = {
    id: 1n,
    clienteId: 10n,
    produtoId: 2n,
    tipoOperacao: 'consumo_remessa',
    direcaoMovimento: 'saida',
    quantidadeCreditos: new Prisma.Decimal(3),
    saldoCreditosProdutoAposMovimento: 7n,
    remessaId: 5n,
    vendaCreditoId: null,
    userIdResponsavel: null,
    observacaoNegocio: 'obs',
    detalhesOperacao: null,
    createdAt: new Date('2026-10-01T10:00:00.000Z'),
    updatedAt: null,
    produto: { id: 2n, nome: 'Cartão PVC', valorCreditos: new Prisma.Decimal('12.50') },
    remessa: { id: 5n, numeroRemessa: 123n, situacao: 'concluido', status: 'concluido' },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    extratoRepo.paginateCobranca.mockResolvedValue({ data: [linha], total: 1 });
    extratoRepo.totaisCobranca.mockResolvedValue({
      total_remessas_faturaveis: 1,
      total_creditos_consumidos: 3,
      valor_total_cobranca: 37.5,
    });
    extratoRepo.totaisCobrancaPorProduto.mockResolvedValue([
      { produto_id: 2, produto_nome: 'Cartão PVC', total_creditos_consumidos: 3 },
    ]);

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        ListarMinhaCobrancaCreditoService,
        { provide: ExtratoMovimentacaoRepository, useValue: extratoRepo },
      ],
    }).compile();

    service = moduleRef.get(ListarMinhaCobrancaCreditoService);
  });

  it('lista a cobrança do próprio cliente sem nenhum valor em R$', async () => {
    const resultado = await service.execute(cliente, {});

    expect(resultado.data).toEqual([
      {
        id: 1n,
        created_at: linha.createdAt,
        produto_id: 2n,
        produto: { id: 2n, nome: 'Cartão PVC' },
        quantidade_creditos: 3,
        remessa_id: 5n,
        remessa: { id: 5n, numero_remessa: 123n, situacao: 'concluido', status: 'concluido' },
        observacao_negocio: 'obs',
      },
    ]);
    expect(resultado.totais).toEqual({
      total_remessas_faturaveis: 1,
      total_creditos_consumidos: 3,
    });
    expect(resultado.totais_por_produto).toEqual([
      { produto_id: 2, produto_nome: 'Cartão PVC', total_creditos_consumidos: 3 },
    ]);
    expect(
      JSON.stringify(resultado, (_k, v) => (typeof v === 'bigint' ? Number(v) : v)),
    ).not.toMatch(/valor/);
    expect(resultado.pagination).toMatchObject({ total: 1 });
  });

  it('usa o id do usuário logado como cliente, ignorando qualquer cliente na query', async () => {
    await service.execute(cliente, { cliente_id: '777' });

    expect(extratoRepo.paginateCobranca).toHaveBeenCalledWith(
      expect.objectContaining({ clienteId: 10n }),
    );
    expect(extratoRepo.totaisCobranca).toHaveBeenCalledWith(10n, expect.any(Object));
    expect(extratoRepo.totaisCobrancaPorProduto).toHaveBeenCalledWith(10n, expect.any(Object));
  });

  it('usa o cliente principal quando o login é de subordinado', async () => {
    await service.execute(subordinado, {});

    expect(extratoRepo.paginateCobranca).toHaveBeenCalledWith(
      expect.objectContaining({ clienteId: 10n }),
    );
  });

  it('repassa filtros, ordenação e paginação ao repositório', async () => {
    await service.execute(cliente, {
      page: 2,
      per_page: 10,
      order: 'asc',
      produto_id: '2',
      numero_remessa: '123',
      status_remessa: 'concluido',
      data_inicio: '2026-10-01',
      data_fim: '2026-10-31',
    });

    const filtros = {
      produtoId: 2n,
      numeroRemessa: '123',
      statusRemessa: 'concluido',
      dataInicio: '2026-10-01',
      dataFim: '2026-10-31',
    };
    expect(extratoRepo.paginateCobranca).toHaveBeenCalledWith({
      clienteId: 10n,
      ...filtros,
      sortBy: 'created_at',
      order: 'asc',
      skip: 10,
      take: 10,
    });
    expect(extratoRepo.totaisCobranca).toHaveBeenCalledWith(10n, filtros);
  });

  it('lança 403 quando o subordinado não tem cliente vinculado', async () => {
    const promessa = service.execute({ ...subordinado, clienteId: null }, {});

    await expect(promessa).rejects.toBeInstanceOf(BusinessException);
    await expect(promessa).rejects.toMatchObject({
      message: MENSAGEM_SEM_PERMISSAO,
      status: HttpStatus.FORBIDDEN,
    });
    expect(extratoRepo.paginateCobranca).not.toHaveBeenCalled();
  });
});
