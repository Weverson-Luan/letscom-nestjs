import { Prisma } from '@prisma/client';
import { mapearCobrancaLinhaCliente } from '../mappers/extrato.mapper';

describe('mapearCobrancaLinhaCliente', () => {
  const linha = {
    id: 1n,
    clienteId: 10n,
    produtoId: 2n,
    tipoOperacao: 'consumo_remessa',
    direcaoMovimento: 'saida',
    quantidadeCreditos: new Prisma.Decimal('3.5'),
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
  } as unknown as Parameters<typeof mapearCobrancaLinhaCliente>[0];

  it('mapeia a linha convertendo a quantidade de créditos para número', () => {
    expect(mapearCobrancaLinhaCliente(linha)).toEqual({
      id: 1n,
      created_at: linha.createdAt,
      produto_id: 2n,
      produto: { id: 2n, nome: 'Cartão PVC' },
      quantidade_creditos: 3.5,
      remessa_id: 5n,
      remessa: { id: 5n, numero_remessa: 123n, situacao: 'concluido', status: 'concluido' },
      observacao_negocio: 'obs',
    });
  });

  it('devolve produto e remessa nulos quando as relações não vêm', () => {
    const resultado = mapearCobrancaLinhaCliente({
      ...linha,
      produto: null,
      remessa: null,
      remessaId: null,
    });

    expect(resultado.produto).toBeNull();
    expect(resultado.remessa).toBeNull();
    expect(resultado.remessa_id).toBeNull();
  });

  it('não expõe valores mesmo com valor de crédito no produto', () => {
    const resultado = mapearCobrancaLinhaCliente(linha);

    expect(resultado).not.toHaveProperty('valor_unitario_credito');
    expect(resultado).not.toHaveProperty('valor_total_linha');
    expect(resultado.produto).not.toHaveProperty('valor_creditos');
  });
});
