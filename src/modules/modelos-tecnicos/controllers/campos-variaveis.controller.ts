import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Role } from 'src/shared/constants/roles';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { PaginationQueryDto } from 'src/shared/dto/pagination-query.dto';
import { ApiResponse } from 'src/shared/utils/api-response';
import {
  CreateCamposVariaveisDto,
  SyncCamposVariaveisDto,
  UpdateCampoVariavelDto,
} from '../dto/campos-variaveis.dto';
import { CamposVariaveisService } from '../services/campos-variaveis.service';

const ROLES = [
  Role.ADMIN,
  Role.PRODUCAO,
  Role.CONSULTOR,
  Role.CLIENTE,
] as const;

@ApiTags('modelos-tecnicos-campos-variaveis')
@ApiBearerAuth()
@Roles(...ROLES)
@Controller('modelos-tecnicos-campos-variaveis')
export class CamposVariaveisController {
  constructor(private readonly service: CamposVariaveisService) {}

  @Get()
  @ApiOperation({ summary: 'Lista campos variáveis (paginado)' })
  async index(@Query() query: PaginationQueryDto) {
    const { data, pagination } = await this.service.listar(
      query as unknown as Record<string, unknown>,
    );
    return ApiResponse.success(
      'Campos variáveis carregados com sucesso!',
      data,
      pagination,
    );
  }

  @Put('modelo/:modeloTecnicoId')
  @ApiParam({ name: 'modeloTecnicoId', description: 'ID do modelo técnico' })
  @ApiOperation({ summary: 'Sincroniza campos variáveis de um modelo' })
  async sync(
    @Param('modeloTecnicoId') modeloTecnicoId: string,
    @Body() body: SyncCamposVariaveisDto,
  ) {
    const data = await this.service.sincronizar(
      BigInt(modeloTecnicoId),
      body.campos ?? [],
    );
    return ApiResponse.success(
      'Campos variáveis sincronizados com sucesso.',
      data,
    );
  }

  @Post()
  @ApiOperation({ summary: 'Cria campos variáveis em lote' })
  async store(@Body() body: CreateCamposVariaveisDto) {
    const data = await this.service.criarBatch(body);
    return ApiResponse.success('Campos variáveis criados com sucesso!', data);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualiza um campo variável' })
  async update(@Param('id') id: string, @Body() body: UpdateCampoVariavelDto) {
    const data = await this.service.atualizar(BigInt(id), body);
    return ApiResponse.success('Campo atualizado com sucesso.', data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove um campo variável e reindexa a ordem' })
  async destroy(@Param('id') id: string) {
    await this.service.excluir(BigInt(id));
    return ApiResponse.success('Campo removido com sucesso.', []);
  }
}
