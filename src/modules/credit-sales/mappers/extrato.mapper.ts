import { ExtratoMovimentacaoCreditoCliente, Product, Remessa, User } from '@prisma/client';

type ExtratoWithRels = ExtratoMovimentacaoCreditoCliente & {
  produto?: Product | null;
  remessa?: Remessa | null;
  responsavel?: User | null;
};

/** Espelha ExtratoCreditoClienteResponseHelper::mapLinhasExtratoCreditoCliente. */
export function mapExtratoLinha(linha: ExtratoWithRels) {
  return {
    id: linha.id,
    cliente_id: linha.clienteId,
    produto_id: linha.produtoId,
    produto: linha.produto
      ? {
          id: linha.produto.id,
          nome: linha.produto.nome,
          valor_creditos: Number(linha.produto.valorCreditos),
        }
      : null,
    tipo_operacao: linha.tipoOperacao,
    direcao_movimento: linha.direcaoMovimento,
    quantidade_creditos: Number(linha.quantidadeCreditos),
    saldo_creditos_produto_apos_movimento: Number(
      linha.saldoCreditosProdutoAposMovimento,
    ),
    remessa_id: linha.remessaId,
    remessa: linha.remessa
      ? {
          id: linha.remessa.id,
          numero_remessa: linha.remessa.numeroRemessa,
        }
      : null,
    venda_credito_id: linha.vendaCreditoId,
    user_id_responsavel: linha.userIdResponsavel,
    usuario_responsavel: linha.responsavel
      ? {
          id: linha.responsavel.id,
          nome: linha.responsavel.nome,
          email: linha.responsavel.email,
        }
      : null,
    observacao_negocio: linha.observacaoNegocio,
    detalhes_operacao: linha.detalhesOperacao,
    created_at: linha.createdAt,
  };
}

/** Espelha CobrancaCreditoClienteResponseHelper::mapLinhasCobranca. */
export function mapCobrancaLinha(linha: ExtratoWithRels) {
  const quantidade = Number(linha.quantidadeCreditos);
  const valorUnitario = linha.produto ? Number(linha.produto.valorCreditos) : 0;

  return {
    id: linha.id,
    created_at: linha.createdAt,
    produto_id: linha.produtoId,
    produto: linha.produto
      ? { id: linha.produto.id, nome: linha.produto.nome }
      : null,
    quantidade_creditos: quantidade,
    valor_unitario_credito: valorUnitario,
    valor_total_linha: Math.round(quantidade * valorUnitario * 100) / 100,
    remessa_id: linha.remessaId,
    remessa: linha.remessa
      ? {
          id: linha.remessa.id,
          numero_remessa: linha.remessa.numeroRemessa,
          situacao: linha.remessa.situacao,
          status: linha.remessa.status,
        }
      : null,
    observacao_negocio: linha.observacaoNegocio,
  };
}
