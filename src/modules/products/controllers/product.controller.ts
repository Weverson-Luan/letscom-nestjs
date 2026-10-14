import { Body, Controller, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Feature } from 'src/shared/auth/features';
import { RequireFeatures } from 'src/shared/decorators/features.decorator';
import { ActiveFilterQueryDto } from 'src/shared/dto/pagination-query.dto';
import { ApiResponse } from 'src/shared/utils/api-response';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { mapProduct } from '../mappers/product.mapper';
import { ProductService } from '../services/product.service';

/**
 * CRUD de produtos — espelha ProductController.
 * Sem role middleware no Laravel: acesso controlado por feature flag.
 * Produtos não são excluídos (apenas inativados via `ativo`).
 */
@ApiTags('products')
@ApiBearerAuth()
@Controller('products')
export class ProductController {
  constructor(private readonly service: ProductService) {}

  @Get()
  @RequireFeatures(
    Feature.ACESSAR_PRODUTOS,
    Feature.CRIAR_MODELOS_TECNICOS,
    Feature.EDITAR_MODELOS_TECNICOS,
    Feature.CRIAR_CREDITO,
    Feature.GERENCIAR_CREDITOS_CLIENTE,
  )
  @ApiOperation({ summary: 'Lista os produtos (paginado, filtro opcional `ativo`)' })
  async index(@Query() query: ActiveFilterQueryDto) {
    const { data, pagination } = await this.service.listar(
      query as unknown as Record<string, unknown>,
    );
    return ApiResponse.success('Produtos carregados com sucesso!', data, pagination);
  }

  @Get(':id')
  @RequireFeatures(
    Feature.ACESSAR_PRODUTOS,
    Feature.CRIAR_MODELOS_TECNICOS,
    Feature.EDITAR_MODELOS_TECNICOS,
  )
  @ApiParam({ name: 'id', description: 'ID do produto' })
  @ApiOperation({ summary: 'Detalha um produto' })
  async show(@Param('id') id: string) {
    const product = await this.service.buscar(BigInt(id));
    return ApiResponse.success('Produto carregado com sucesso!', mapProduct(product));
  }

  @Post()
  @RequireFeatures(Feature.ACESSAR_PRODUTOS)
  @HttpCode(201)
  @ApiOperation({ summary: 'Cria um produto' })
  async store(@Body() body: CreateProductDto) {
    const product = await this.service.criar(body);
    return ApiResponse.success('Produto criado com sucesso!', mapProduct(product), null, 201);
  }

  @Put(':id')
  @RequireFeatures(Feature.ACESSAR_PRODUTOS)
  @ApiParam({ name: 'id', description: 'ID do produto' })
  @ApiOperation({ summary: 'Atualiza um produto' })
  async update(@Param('id') id: string, @Body() body: UpdateProductDto) {
    const product = await this.service.atualizar(BigInt(id), body);
    return ApiResponse.success('Produto atualizado com sucesso!', mapProduct(product));
  }
}
