import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from 'src/shared/constants/roles';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { ApiResponse } from 'src/shared/utils/api-response';
import { CreateFeatureFlagDto } from '../dto/create-feature-flag.dto';
import { UpdateFeatureFlagDto } from '../dto/update-feature-flag.dto';
import { mapFeatureFlag } from '../mappers/feature-flag.mapper';
import { FeatureFlagService } from '../services/feature-flag.service';

@ApiTags('feature-flags')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('feature-flags')
export class FeatureFlagController {
  constructor(private readonly service: FeatureFlagService) {}

  @Get()
  @ApiOperation({ summary: 'Lista as feature flags' })
  async index() {
    const flags = await this.service.listar();
    return ApiResponse.success(
      'Feature flags carregadas com sucesso!',
      flags.map(mapFeatureFlag),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha uma feature flag' })
  async show(@Param('id') id: string) {
    const flag = await this.service.buscar(BigInt(id));
    return ApiResponse.success(
      'Feature flag carregada com sucesso!',
      mapFeatureFlag(flag),
    );
  }

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Cria uma feature flag' })
  async store(@Body() body: CreateFeatureFlagDto) {
    const flag = await this.service.criar(body);
    return ApiResponse.success(
      'Feature flag criada com sucesso!',
      mapFeatureFlag(flag),
      null,
      201,
    );
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualiza uma feature flag' })
  async update(@Param('id') id: string, @Body() body: UpdateFeatureFlagDto) {
    const flag = await this.service.atualizar(BigInt(id), body);
    return ApiResponse.success(
      'Feature flag atualizada com sucesso!',
      mapFeatureFlag(flag),
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Exclui uma feature flag' })
  async destroy(@Param('id') id: string) {
    await this.service.excluir(BigInt(id));
    return ApiResponse.success('Feature flag excluída com sucesso!', []);
  }
}
