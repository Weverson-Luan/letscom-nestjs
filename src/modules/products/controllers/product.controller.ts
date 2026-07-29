import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { PaginationQueryDto } from 'src/shared/dto/pagination-query.dto';
import { ApiResponse } from 'src/shared/utils/api-response';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { mapProduct } from '../mappers/product.mapper';
import { ProductService } from '../services/product.service';

/**
 * CRUD de produtos — espelha ProductController.
 * JWT only (sem role middleware no Laravel).
 */
@ApiTags('products')
@ApiBearerAuth()
@Controller('products')
export class ProductController {
  constructor(private readonly service: ProductService) {}

  @Get()
  @ApiOperation({ summary: 'Lista os produtos (paginado)' })
  async index(@Query() query: PaginationQueryDto) {
    const { data, pagination } = await this.service.listar(
      query as unknown as Record<string, unknown>,
    );
    return ApiResponse.success(
      'Produtos carregados com sucesso!',
      data,
      pagination,
    );
  }

  @Get(':id')
  @ApiParam({ name: 'id', description: 'ID do produto' })
  @ApiOperation({ summary: 'Detalha um produto' })
  async show(@Param('id') id: string) {
    const product = await this.service.buscar(BigInt(id));
    return ApiResponse.success(
      'Produto carregado com sucesso!',
      mapProduct(product),
    );
  }

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Cria um produto' })
  async store(@Body() body: CreateProductDto) {
    const product = await this.service.criar(body);
    return ApiResponse.success(
      'Produto criado com sucesso!',
      mapProduct(product),
      null,
      201,
    );
  }

  @Put(':id')
  @ApiParam({ name: 'id', description: 'ID do produto' })
  @ApiOperation({ summary: 'Atualiza um produto' })
  async update(@Param('id') id: string, @Body() body: UpdateProductDto) {
    const product = await this.service.atualizar(BigInt(id), body);
    return ApiResponse.success(
      'Produto atualizado com sucesso!',
      mapProduct(product),
    );
  }

  @Delete(':id')
  @ApiParam({ name: 'id', description: 'ID do produto' })
  @ApiOperation({ summary: 'Exclui (soft delete) um produto' })
  async destroy(@Param('id') id: string) {
    await this.service.excluir(BigInt(id));
    return ApiResponse.success('Produto removido com sucesso!', []);
  }
}
