import { Product } from '@prisma/client';

/** Espelha ProductsResponseHelper::mapProdutos (com estoque_atual correto). */
export function mapProduct(product: Product) {
  return {
    id: product.id,
    nome: product.nome,
    valor: Number(product.valor),
    valor_creditos: Number(product.valorCreditos),
    tecnologia: null,
    estoque_maximo: product.estoqueMaximo,
    estoque_minimo: product.estoqueMinimo,
    estoque_atual: product.estoqueAtual,
    ativo: product.ativo,
    created_at: product.createdAt,
    updated_at: product.updatedAt,
    deleted_at: product.deletedAt,
  };
}
