import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { resolvePagination } from 'src/shared/database/pagination';
import { BusinessException } from 'src/shared/exceptions/business.exception';
import { buildPagination } from 'src/shared/utils/api-response';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { mapProduct } from '../mappers/product.mapper';
import { ProductRepository } from '../repositories/product.repository';

/** Espelha o ProductService (CRUD de produtos). */
@Injectable()
export class ProductService {
  constructor(private readonly repository: ProductRepository) {}

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
      data: data.map(mapProduct),
      pagination: buildPagination(total, page, perPage),
    };
  }

  async buscar(id: bigint) {
    const product = await this.repository.findById(id);
    if (!product) {
      throw new NotFoundException('Produto não encontrado.');
    }
    return product;
  }

  async criar(dto: CreateProductDto) {
    this.validarEstoque(dto.estoque_minimo, dto.estoque_maximo, dto.estoque_atual);

    const data: Prisma.ProductCreateInput = {
      nome: dto.nome,
      valor: dto.valor,
      valorCreditos: dto.valor_creditos,
      estoqueMinimo: dto.estoque_minimo,
      estoqueMaximo: dto.estoque_maximo,
      estoqueAtual: dto.estoque_atual,
      ativo: true,
    };
    return this.repository.create(data);
  }

  async atualizar(id: bigint, dto: UpdateProductDto) {
    const atual = await this.buscar(id);

    const estoqueMinimo = dto.estoque_minimo ?? atual.estoqueMinimo;
    const estoqueMaximo = dto.estoque_maximo ?? atual.estoqueMaximo;
    const estoqueAtual = dto.estoque_atual ?? atual.estoqueAtual;
    this.validarEstoque(estoqueMinimo, estoqueMaximo, estoqueAtual);

    const data: Prisma.ProductUpdateInput = {};
    if (dto.nome !== undefined) data.nome = dto.nome;
    if (dto.valor !== undefined) data.valor = dto.valor;
    if (dto.valor_creditos !== undefined) data.valorCreditos = dto.valor_creditos;
    if (dto.estoque_minimo !== undefined) data.estoqueMinimo = dto.estoque_minimo;
    if (dto.estoque_maximo !== undefined) data.estoqueMaximo = dto.estoque_maximo;
    if (dto.estoque_atual !== undefined) data.estoqueAtual = dto.estoque_atual;

    return this.repository.update(id, data);
  }

  async excluir(id: bigint) {
    await this.buscar(id);
    await this.repository.softDelete(id);
  }

  private validarEstoque(minimo: number, maximo: number, atual: number) {
    if (maximo <= minimo) {
      throw new BusinessException(
        'O estoque máximo deve ser maior que o mínimo',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    if (atual < minimo || atual > maximo) {
      throw new BusinessException(
        'O estoque atual deve estar entre o mínimo e máximo',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
  }
}
