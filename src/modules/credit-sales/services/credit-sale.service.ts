import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  DirecaoMovimentoCreditoCliente,
  TipoOperacaoCreditoCliente,
} from 'src/shared/constants/credito';
import { resolvePagination } from 'src/shared/database/pagination';
import { AuthUser } from 'src/shared/decorators/current-user.decorator';
import { BusinessException } from 'src/shared/exceptions/business.exception';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { buildPagination } from 'src/shared/utils/api-response';
import { CreateCreditSaleDto } from '../dto/create-credit-sale.dto';
import { UpdateCreditSaleDto } from '../dto/update-credit-sale.dto';
import { mapCreditSale } from '../mappers/credit-sale.mapper';
import { CreditSaleRepository } from '../repositories/credit-sale.repository';
import { CreditoClienteExtratoService } from './credito-cliente-extrato.service';

const ROLES_AUTO_CONFIRM = new Set(['admin', 'producao', 'consultor']);

/** Espelha CreditSaleService. */
@Injectable()
export class CreditSaleService {
  constructor(
    private readonly repository: CreditSaleRepository,
    private readonly extratoService: CreditoClienteExtratoService,
    private readonly prisma: PrismaService,
  ) {}

  async listar(query: Record<string, unknown>) {
    const { page, perPage, skip, take } = resolvePagination(query, 10, 100);
    const order =
      String(query.order ?? 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';

    const { data, total } = await this.repository.paginate({
      search: query.search as string | undefined,
      sortBy: (query.sort_by as string) ?? 'created_at',
      order,
      skip,
      take,
    });

    return {
      data: data.map(mapCreditSale),
      pagination: buildPagination(total, page, perPage),
    };
  }

  async listarPorCliente(clienteId: bigint, query: Record<string, unknown>) {
    const { page, perPage, skip, take } = resolvePagination(query, 10, 100);
    const order =
      String(query.order ?? 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';

    const { data, total } = await this.repository.paginate({
      clienteId,
      search: query.search as string | undefined,
      sortBy: (query.sort_by as string) ?? 'created_at',
      order,
      skip,
      take,
    });

    return {
      data: data.map(mapCreditSale),
      pagination: buildPagination(total, page, perPage),
    };
  }

  async saldoPorCliente(clienteId: bigint, format: string = 'list') {
    if (format === 'map') {
      const map = await this.repository.saldoPorClienteMap(clienteId);
      return {
        cliente_id: Number(clienteId),
        format: 'map',
        saldo_total: Object.values(map).reduce((a, b) => a + Number(b), 0),
        creditos: map,
      };
    }

    const rows = await this.repository.saldoPorClienteList(clienteId);
    const creditos = rows.map((r) => ({
      produto_id: Number(r.produto_id),
      tipo: r.tipo,
      total: Number(r.total),
    }));
    return {
      cliente_id: Number(clienteId),
      format: 'list',
      saldo_total: creditos.reduce((a, b) => a + b.total, 0),
      creditos,
    };
  }

  async buscar(id: bigint) {
    const sale = await this.repository.findById(id);
    if (!sale) throw new NotFoundException('Venda de créditos não encontrada.');
    return sale;
  }

  async criar(dto: CreateCreditSaleDto, user: AuthUser) {
    if (dto.quantidade_creditos < 0) {
      throw new BusinessException(
        'A quantidade de créditos não pode ser negativa!',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const cliente = await this.prisma.user.findFirst({
      where: { id: BigInt(dto.cliente_id), deletedAt: null },
    });
    if (!cliente) {
      throw new BusinessException(
        'Cliente não encontrado.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const produto = await this.prisma.product.findFirst({
      where: { id: BigInt(dto.produto_id), deletedAt: null },
    });
    if (!produto) {
      throw new BusinessException(
        'Produto não encontrado.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const role = (user.roles?.[0] ?? '').toLowerCase();
    const status = ROLES_AUTO_CONFIRM.has(role)
      ? 'confirmado'
      : (dto.status ?? 'pendente');

    const executorId = dto.user_id_executor
      ? BigInt(dto.user_id_executor)
      : user.id;

    return this.prisma.$transaction(async (tx) => {
      const venda = await tx.creditSale.create({
        data: {
          clienteId: BigInt(dto.cliente_id),
          userIdExecutor: executorId,
          produtoId: BigInt(dto.produto_id),
          quantidadeCreditos: dto.quantidade_creditos,
          tipoTransacao: dto.tipo_transacao?.toLowerCase() as 'entrada' | 'saida',
          status,
          dataVenda: new Date(),
          valor: 0,
          valorTotal: 0,
          observacao: dto.observacao ?? null,
        },
        include: { produto: true, executor: true },
      });

      await this.registrarExtratoNovaVenda(venda, tx);
      return venda;
    });
  }

  async atualizar(id: bigint, dto: UpdateCreditSaleDto) {
    const sale = await this.buscar(id);
    if (sale.status === 'confirmado' || sale.status === 'cancelado') {
      throw new BusinessException(
        'Não é possível alterar uma venda já confirmada',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const data: Prisma.CreditSaleUpdateInput = {};
    if (dto.cliente_id !== undefined) {
      data.cliente = { connect: { id: BigInt(dto.cliente_id) } };
    }
    if (dto.produto_id !== undefined) {
      data.produto = { connect: { id: BigInt(dto.produto_id) } };
    }
    if (dto.quantidade_creditos !== undefined) {
      data.quantidadeCreditos = dto.quantidade_creditos;
    }
    if (dto.valor !== undefined) data.valor = dto.valor;
    if (dto.valor_total !== undefined) data.valorTotal = dto.valor_total;
    if (dto.tipo_transacao !== undefined) data.tipoTransacao = dto.tipo_transacao;
    if (dto.observacao !== undefined) data.observacao = dto.observacao;

    return this.repository.update(id, data);
  }

  async excluir(id: bigint) {
    const sale = await this.buscar(id);
    if (sale.status === 'confirmado') {
      throw new BusinessException(
        'Não é possível excluir uma venda já confirmada',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    await this.repository.softDelete(id);
  }

  async cancelar(id: bigint) {
    const sale = await this.buscar(id);
    if (sale.status !== 'confirmado' && sale.status !== 'pendente') {
      throw new BusinessException(
        'Apenas vendas com status "confirmado" ou "pendente" podem ser canceladas.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const statusAnterior = sale.status;
    const tipoTransacao = sale.tipoTransacao ?? 'entrada';

    await this.prisma.$transaction(async (tx) => {
      await tx.creditSale.update({
        where: { id },
        data: { status: 'cancelada' },
      });

      await this.extratoService.registrarLinha(
        {
          clienteId: sale.clienteId,
          produtoId: sale.produtoId,
          tipoOperacao:
            TipoOperacaoCreditoCliente.ESTORNO_CANCELAMENTO_VENDA_CREDITOS,
          direcaoMovimento: DirecaoMovimentoCreditoCliente.SAIDA,
          quantidadeCreditos: Number(sale.quantidadeCreditos),
          vendaCreditoId: sale.id,
          userIdResponsavel: sale.userIdExecutor,
          observacaoNegocio: `Cancelamento administrativo da venda de créditos #${sale.id}`,
          detalhesOperacao: {
            status_anterior_venda_credito: statusAnterior,
            tipo_transacao_venda_cancelada: tipoTransacao,
          },
        },
        tx,
      );
    });
  }

  private async registrarExtratoNovaVenda(
    venda: {
      id: bigint;
      clienteId: bigint;
      produtoId: bigint;
      userIdExecutor: bigint;
      status: string;
      tipoTransacao: string | null;
      quantidadeCreditos: Prisma.Decimal | number;
      observacao: string | null;
    },
    tx: Prisma.TransactionClient,
  ) {
    const tipoTransacao = String(venda.tipoTransacao ?? 'entrada');
    const direcao =
      tipoTransacao === 'saida'
        ? DirecaoMovimentoCreditoCliente.SAIDA
        : DirecaoMovimentoCreditoCliente.ENTRADA;

    let tipoOperacao = TipoOperacaoCreditoCliente.COMPRA_CREDITOS;
    if (venda.status === 'confirmado' && tipoTransacao === 'entrada') {
      tipoOperacao = TipoOperacaoCreditoCliente.COMPRA_CREDITOS;
    } else if (venda.status === 'pendente' && tipoTransacao === 'entrada') {
      tipoOperacao = TipoOperacaoCreditoCliente.LIBERACAO_CREDITOS_PENDENTE;
    }

    await this.extratoService.registrarLinha(
      {
        clienteId: venda.clienteId,
        produtoId: venda.produtoId,
        tipoOperacao,
        direcaoMovimento: direcao,
        quantidadeCreditos: Number(venda.quantidadeCreditos),
        vendaCreditoId: venda.id,
        userIdResponsavel: venda.userIdExecutor,
        observacaoNegocio: venda.observacao,
      },
      tx,
    );
  }
}
