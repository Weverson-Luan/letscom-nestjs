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
import { mapEndereco } from '../../enderecos/mappers/endereco.mapper';
import {
  CreateEnderecoEntregaDto,
  UpdateEnderecoEntregaDto,
} from '../dto/endereco-entrega.dto';
import { EnderecoEntregaService } from '../services/endereco-entrega.service';

@ApiTags('enderecos-entrega')
@ApiBearerAuth()
@Controller('enderecos-entrega')
export class EnderecoEntregaController {
  constructor(private readonly service: EnderecoEntregaService) {}

  @Get()
  @ApiOperation({ summary: 'Lista endereços de entrega' })
  async index(@Query() query: PaginationQueryDto) {
    const { data, pagination } = await this.service.listar(
      query as unknown as Record<string, unknown>,
    );
    return ApiResponse.success(
      'Endereços de entrega carregados com sucesso!',
      data,
      pagination,
    );
  }

  @Get(':id')
  @ApiParam({ name: 'id', description: 'ID do endereço de entrega' })
  @ApiOperation({ summary: 'Detalha um endereço de entrega' })
  async show(@Param('id') id: string) {
    const endereco = await this.service.buscar(BigInt(id));
    return mapEndereco(endereco);
  }

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Cria um endereço de entrega' })
  async store(@Body() body: CreateEnderecoEntregaDto) {
    const endereco = await this.service.criar(body);
    return mapEndereco(endereco);
  }

  @Put(':id')
  @ApiParam({ name: 'id', description: 'ID do endereço de entrega' })
  @ApiOperation({ summary: 'Atualiza um endereço de entrega' })
  async update(@Param('id') id: string, @Body() body: UpdateEnderecoEntregaDto) {
    const endereco = await this.service.atualizar(BigInt(id), body);
    return mapEndereco(endereco);
  }

  @Delete(':id')
  @ApiParam({ name: 'id', description: 'ID do endereço de entrega' })
  @ApiOperation({ summary: 'Remove um endereço de entrega' })
  async destroy(@Param('id') id: string) {
    await this.service.excluir(BigInt(id));
    return { message: 'Endereço de entrega removido com sucesso.' };
  }
}
