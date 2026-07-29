import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  DirecaoMovimentoCreditoCliente,
  TipoOperacaoCreditoCliente,
} from 'src/shared/constants/credito';
import { resolvePagination } from 'src/shared/database/pagination';
import { buildPagination } from 'src/shared/utils/api-response';
import { mapCobrancaLinha, mapExtratoLinha } from '../mappers/extrato.mapper';
import { CreditSaleRepository } from '../repositories/credit-sale.repository';
import { ExtratoMovimentacaoRepository } from '../repositories/extrato-movimentacao.repository';

export type RegistrarExtratoInput = {
  clienteId: bigint;
  produtoId: bigint;
  tipoOperacao: string;
  direcaoMovimento: string;
  quantidadeCreditos: number;
  vendaCreditoId?: bigint | null;
  remessaId?: bigint | null;
  userIdResponsavel?: bigint | null;
  observacaoNegocio?: string | null;
  detalhesOperacao?: Prisma.InputJsonValue | null;
};

/** Espelha CreditoClienteExtratoService. */
@Injectable()
export class CreditoClienteExtratoService {
  constructor(
    private readonly extratoRepo: ExtratoMovimentacaoRepository,
    private readonly creditSaleRepo: CreditSaleRepository,
  ) {}

  /**
   * Registra linha no extrato após o movimento já estar em vendas_creditos.
   * Calcula snapshot do saldo confirmado pós-movimento.
   */
  async registrarLinha(
    attrs: RegistrarExtratoInput,
    tx?: Prisma.TransactionClient,
  ) {
    const saldo = await this.creditSaleRepo.saldoConfirmado(
      attrs.clienteId,
      attrs.produtoId,
      tx,
    );

    const data: Prisma.ExtratoMovimentacaoCreditoClienteCreateInput = {
      cliente: { connect: { id: attrs.clienteId } },
      produto: { connect: { id: attrs.produtoId } },
      tipoOperacao: attrs.tipoOperacao,
      direcaoMovimento: attrs.direcaoMovimento,
      quantidadeCreditos: attrs.quantidadeCreditos,
      saldoCreditosProdutoAposMovimento: BigInt(Math.max(0, saldo)),
      observacaoNegocio: attrs.observacaoNegocio ?? null,
      detalhesOperacao: attrs.detalhesOperacao ?? undefined,
      ...(attrs.vendaCreditoId
        ? { vendaCredito: { connect: { id: attrs.vendaCreditoId } } }
        : {}),
      ...(attrs.remessaId
        ? { remessa: { connect: { id: attrs.remessaId } } }
        : {}),
      ...(attrs.userIdResponsavel
        ? { responsavel: { connect: { id: attrs.userIdResponsavel } } }
        : {}),
    };

    if (tx) {
      return tx.extratoMovimentacaoCreditoCliente.create({ data });
    }
    return this.extratoRepo.create(data);
  }

  async listarPorCliente(
    clienteId: bigint,
    query: Record<string, unknown>,
  ) {
    const { page, perPage, skip, take } = resolvePagination(query, 15, 100);
    const order =
      String(query.order ?? 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';

    const { data, total } = await this.extratoRepo.paginatePorCliente({
      clienteId,
      produtoId: query.produto_id ? BigInt(String(query.produto_id)) : undefined,
      tipoOperacao: query.tipo_operacao as string | undefined,
      direcaoMovimento: query.direcao_movimento as string | undefined,
      dataInicio: query.data_inicio as string | undefined,
      dataFim: query.data_fim as string | undefined,
      sortBy: (query.sort_by as string) ?? 'created_at',
      order,
      skip,
      take,
    });

    return {
      data: data.map(mapExtratoLinha),
      pagination: buildPagination(total, page, perPage),
    };
  }

  async listarCobranca(
    clienteId: bigint,
    query: Record<string, unknown>,
  ) {
    const { page, perPage, skip, take } = resolvePagination(query, 15, 100);
    const order =
      String(query.order ?? 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';

    const filtros = {
      produtoId: query.produto_id ? BigInt(String(query.produto_id)) : undefined,
      numeroRemessa: query.numero_remessa
        ? String(query.numero_remessa)
        : undefined,
      statusRemessa: query.status_remessa as string | undefined,
      dataInicio: query.data_inicio as string | undefined,
      dataFim: query.data_fim as string | undefined,
    };

    const [{ data, total }, totais] = await Promise.all([
      this.extratoRepo.paginateCobranca({
        clienteId,
        ...filtros,
        sortBy: (query.sort_by as string) ?? 'created_at',
        order,
        skip,
        take,
      }),
      this.extratoRepo.totaisCobranca(clienteId, filtros),
    ]);

    return {
      data: data.map(mapCobrancaLinha),
      pagination: buildPagination(total, page, perPage),
      totais,
    };
  }
}

export { DirecaoMovimentoCreditoCliente, TipoOperacaoCreditoCliente };
