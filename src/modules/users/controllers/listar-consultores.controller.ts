/**
 * IMPORTS
 */
import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

// shared
import { Feature } from 'src/shared/auth/features';
import { Role } from 'src/shared/constants/roles';
import { RequireFeatures } from 'src/shared/decorators/features.decorator';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { PaginationQueryDto } from 'src/shared/dto/pagination-query.dto';
import { ApiResponse } from 'src/shared/utils/api-response';

// services
import { ListarConsultoresService } from '../services/listar-consultores.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class ListarConsultoresController {
  constructor(private readonly listarConsultoresService: ListarConsultoresService) {}

  @Get('consultores')
  @RequireFeatures(Feature.CRIAR_CLIENTE, Feature.EDITAR_CLIENTE)
  @Roles(Role.ADMIN, Role.PRODUCAO, Role.CONSULTOR)
  @ApiOperation({ summary: 'Lista usuários consultores' })
  async buscarUsuariosConsultores(@Query() query: PaginationQueryDto) {
    const result = await this.listarConsultoresService.execute(
      query as unknown as Record<string, unknown>,
    );
    return ApiResponse.success(
      'Usuários consultores carregados com sucesso!',
      result.data,
      result.pagination,
    );
  }
}
