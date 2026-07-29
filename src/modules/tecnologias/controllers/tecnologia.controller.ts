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
import { ALL_ROLES, Role } from 'src/shared/constants/roles';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { PaginationQueryDto } from 'src/shared/dto/pagination-query.dto';
import { ApiResponse } from 'src/shared/utils/api-response';
import { CreateTecnologiaDto } from '../dto/create-tecnologia.dto';
import { UpdateTecnologiaDto } from '../dto/update-tecnologia.dto';
import { mapTecnologia } from '../mappers/tecnologia.mapper';
import { TecnologiaService } from '../services/tecnologia.service';

@ApiTags('tecnologias')
@ApiBearerAuth()
@Controller('tecnologias')
export class TecnologiaController {
  constructor(private readonly service: TecnologiaService) {}

  @Get()
  @Roles(...ALL_ROLES)
  @ApiOperation({ summary: 'Lista as tecnologias (paginado)' })
  async index(@Query() query: PaginationQueryDto) {
    const { data, pagination } = await this.service.listar(
      query as unknown as Record<string, unknown>,
    );
    return ApiResponse.success(
      'Tecnologias carregadas com sucesso!',
      data,
      pagination,
    );
  }

  @Get(':id')
  @Roles(...ALL_ROLES)
  @ApiParam({ name: 'id', description: 'ID da tecnologia' })
  @ApiOperation({ summary: 'Detalha uma tecnologia' })
  async show(@Param('id') id: string) {
    const tecnologia = await this.service.buscar(BigInt(id));
    return ApiResponse.success(
      'Tecnologia carregada com sucesso!',
      mapTecnologia(tecnologia),
    );
  }

  @Post()
  @Roles(...ALL_ROLES)
  @HttpCode(201)
  @ApiOperation({ summary: 'Cria uma tecnologia' })
  async store(@Body() body: CreateTecnologiaDto) {
    const tecnologia = await this.service.criar(body);
    return ApiResponse.success(
      'Tecnologia criada com sucesso!',
      mapTecnologia(tecnologia),
      null,
      201,
    );
  }

  @Put(':id')
  @Roles(...ALL_ROLES)
  @ApiParam({ name: 'id', description: 'ID da tecnologia' })
  @ApiOperation({ summary: 'Atualiza uma tecnologia' })
  async update(@Param('id') id: string, @Body() body: UpdateTecnologiaDto) {
    const tecnologia = await this.service.atualizar(BigInt(id), body);
    return ApiResponse.success(
      'Tecnologia atualizada com sucesso!',
      mapTecnologia(tecnologia),
    );
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.CONSULTOR)
  @ApiParam({ name: 'id', description: 'ID da tecnologia' })
  @ApiOperation({ summary: 'Exclui uma tecnologia' })
  async destroy(@Param('id') id: string) {
    await this.service.excluir(BigInt(id));
    return ApiResponse.success('Tecnologia removida com sucesso', []);
  }
}
