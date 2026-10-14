import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ALL_ROLES } from 'src/shared/constants/roles';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { PaginationQueryDto } from 'src/shared/dto/pagination-query.dto';
import { ApiResponse } from 'src/shared/utils/api-response';
import { CreateEnderecoDto } from '../dto/create-endereco.dto';
import { UpdateEnderecoDto } from '../dto/update-endereco.dto';
import { mapEndereco } from '../mappers/endereco.mapper';
import { EnderecoService } from '../services/endereco.service';
import { Feature, FEATURES_LIBERACAO } from 'src/shared/auth/features';
import { RequireFeatures } from 'src/shared/decorators/features.decorator';

@ApiTags('enderecos')
@ApiBearerAuth()
@Roles(...ALL_ROLES)
@Controller('enderecos')
export class EnderecoController {
  constructor(private readonly service: EnderecoService) {}

  @Get()
  @RequireFeatures(Feature.EDITAR_CLIENTE)
  @ApiOperation({ summary: 'Lista endereços (paginado)' })
  async index(@Query() query: PaginationQueryDto) {
    const { data, pagination } = await this.service.listar(
      query as unknown as Record<string, unknown>,
    );
    return ApiResponse.success('Endereços carregados com sucesso!', data, pagination);
  }

  @Get('usuarios/:id/enderecos-por-tipo')
  @RequireFeatures(Feature.EDITAR_CLIENTE, ...FEATURES_LIBERACAO)
  @ApiParam({ name: 'id', description: 'ID do usuário' })
  @ApiOperation({
    summary: 'Retorna endereços residencial e entrega de um usuário',
  })
  async porTipo(@Param('id') id: string) {
    const data = await this.service.porTipo(BigInt(id));
    return ApiResponse.success('Endereços por tipo carregados com sucesso!', data);
  }

  @Get(':id')
  @RequireFeatures(Feature.EDITAR_CLIENTE)
  @ApiOperation({ summary: 'Detalha um endereço' })
  async show(@Param('id') id: string) {
    const endereco = await this.service.buscar(BigInt(id));
    return ApiResponse.success('Endereço carregado com sucesso!', mapEndereco(endereco));
  }

  @Post()
  @RequireFeatures(Feature.CRIAR_CLIENTE, Feature.EDITAR_CLIENTE)
  @HttpCode(201)
  @ApiOperation({ summary: 'Cria um endereço vinculado a um usuário' })
  async store(@Body() body: CreateEnderecoDto) {
    const endereco = await this.service.criar(body);
    return ApiResponse.success('Endereço criado com sucesso!', mapEndereco(endereco), null, 201);
  }

  @Put(':id')
  @RequireFeatures(Feature.EDITAR_CLIENTE)
  @ApiOperation({ summary: 'Atualiza um endereço' })
  async update(@Param('id') id: string, @Body() body: UpdateEnderecoDto) {
    const endereco = await this.service.atualizar(BigInt(id), body);
    return ApiResponse.success('Endereço atualizado com sucesso!', mapEndereco(endereco));
  }

  @Delete(':id')
  @RequireFeatures(Feature.EDITAR_CLIENTE)
  @ApiOperation({ summary: 'Remove um endereço' })
  async destroy(@Param('id') id: string) {
    await this.service.excluir(BigInt(id));
    return ApiResponse.success('Endereço removido com sucesso.', []);
  }
}
