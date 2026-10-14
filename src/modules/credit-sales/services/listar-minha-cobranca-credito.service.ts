import { HttpStatus, Injectable } from '@nestjs/common';
import { MENSAGEM_SEM_PERMISSAO } from 'src/shared/auth/features';
import { resolvePagination } from 'src/shared/database/pagination';
import { AuthUser } from 'src/shared/decorators/current-user.decorator';
import { BusinessException } from 'src/shared/exceptions/business.exception';
import { buildPagination } from 'src/shared/utils/api-response';
import { mapearCobrancaLinhaCliente } from '../mappers/extrato.mapper';
import { ExtratoMovimentacaoRepository } from '../repositories/extrato-movimentacao.repository';
import { montarFiltrosCobranca } from './helpers/montar-filtros-cobranca.helper';
import { resolverClienteAutenticado } from './helpers/resolver-cliente-autenticado.helper';

/**
 * Cobrança de créditos do próprio cliente logado (cliente ou subordinado).
 * Mesmas linhas, filtros e totais da cobrança do backoffice, sem nenhum valor em R$.
 */
@Injectable()
export class ListarMinhaCobrancaCreditoService {
  constructor(private readonly extratoRepo: ExtratoMovimentacaoRepository) {}

  async execute(usuario: AuthUser, query: Record<string, unknown>) {
    const clienteId = resolverClienteAutenticado(usuario);
    if (!clienteId) {
      throw new BusinessException(MENSAGEM_SEM_PERMISSAO, HttpStatus.FORBIDDEN);
    }

    const { page, perPage, skip, take } = resolvePagination(query, 15, 100);
    const order = String(query.order ?? 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';
    const filtros = montarFiltrosCobranca(query);

    const [{ data, total }, totais, totaisPorProduto] = await Promise.all([
      this.extratoRepo.paginateCobranca({
        clienteId,
        ...filtros,
        sortBy: (query.sort_by as string) ?? 'created_at',
        order,
        skip,
        take,
      }),
      this.extratoRepo.totaisCobranca(clienteId, filtros),
      this.extratoRepo.totaisCobrancaPorProduto(clienteId, filtros),
    ]);

    return {
      data: data.map(mapearCobrancaLinhaCliente),
      pagination: buildPagination(total, page, perPage),
      totais: {
        total_remessas_faturaveis: totais.total_remessas_faturaveis,
        total_creditos_consumidos: totais.total_creditos_consumidos,
      },
      totais_por_produto: totaisPorProduto,
    };
  }
}
