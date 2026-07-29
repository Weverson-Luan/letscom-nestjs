import { CreditSale, Product, User } from '@prisma/client';

function formatarValor(valor: number | string): number | string {
  const n = Number(valor);
  return Number.isInteger(n) || fmod(n, 1) === 0 ? Math.trunc(n) : n.toFixed(2);
}

function fmod(a: number, b: number): number {
  return a % b;
}

type SaleWithRels = CreditSale & {
  produto?: Product | null;
  executor?: User | null;
};

/** Espelha CreditsSalesResponseHelper::mapVendasCredito. */
export function mapCreditSale(sale: SaleWithRels) {
  return {
    id: sale.id,
    user_id: sale.clienteId,
    cliente_id: sale.clienteId,
    status: sale.status,
    valor: Number(sale.valor),
    quantidade_creditos: formatarValor(Number(sale.quantidadeCreditos)),
    data_venda: sale.dataVenda,
    tipo_transacao: sale.tipoTransacao,
    produto: sale.produto
      ? {
          id: sale.produto.id,
          nome: sale.produto.nome,
          valor: Number(sale.produto.valor),
          valor_creditos: Number(sale.produto.valorCreditos),
          estoque_minimo: sale.produto.estoqueMinimo,
          estoque_maximo: sale.produto.estoqueMaximo,
          estoque_atual: sale.produto.estoqueAtual,
          ativo: sale.produto.ativo,
        }
      : null,
    designer: sale.executor
      ? {
          id: sale.executor.id,
          nome: sale.executor.nome,
          email: sale.executor.email,
        }
      : null,
    observacao: sale.observacao,
    created_at: sale.createdAt,
    updated_at: sale.updatedAt,
    deleted_at: sale.deletedAt,
  };
}
