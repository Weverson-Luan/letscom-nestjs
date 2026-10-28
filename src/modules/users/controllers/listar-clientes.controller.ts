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
import { ListarClientesService } from '../services/listar-clientes.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class ListarClientesController {
  constructor(private readonly listarClientesService: ListarClientesService) {}

  @Get()
  @RequireFeatures(Feature.VISUALIZAR_CLIENTE)
  @Roles(Role.ADMIN, Role.PRODUCAO, Role.CONSULTOR)
  @ApiOperation({ summary: 'Lista clientes/usuários' })
  async buscarClientes(@Query() query: PaginationQueryDto) {
    const result = await this.listarClientesService.execute(
      query as unknown as Record<string, unknown>,
    );
    return ApiResponse.success('Usuários carregadas com sucesso!', result.data, result.pagination);
  }
}
