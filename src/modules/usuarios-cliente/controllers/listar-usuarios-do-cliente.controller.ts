/**
 * IMPORTS
 */
import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

// shared
import { Feature } from 'src/shared/auth/features';
import { Role } from 'src/shared/constants/roles';
import { RequireFeatures } from 'src/shared/decorators/features.decorator';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { PaginationQueryDto } from 'src/shared/dto/pagination-query.dto';
import { ApiResponse } from 'src/shared/utils/api-response';

// services
import { ListarUsuariosDoClienteService } from '../services/listar-usuarios-do-cliente.service';

@ApiTags('usuarios-cliente')
@ApiBearerAuth()
@Controller('usuarios-cliente')
export class ListarUsuariosDoClienteController {
  constructor(private readonly listarUsuariosDoClienteService: ListarUsuariosDoClienteService) {}

  @Get('cliente/:id')
  @RequireFeatures(Feature.VISUALIZAR_USUARIO_CLIENTE)
  @Roles(Role.ADMIN, Role.PRODUCAO, Role.CONSULTOR)
  @ApiParam({ name: 'id', description: 'ID do cliente' })
  @ApiOperation({ summary: 'Lista os usuários de um cliente (paginado)' })
  async listarUsuariosDoCliente(@Param('id') id: string, @Query() query: PaginationQueryDto) {
    const { data, pagination } = await this.listarUsuariosDoClienteService.execute(
      BigInt(id),
      query as unknown as Record<string, unknown>,
    );
    return ApiResponse.success('Usuários do cliente carregados com sucesso!', data, pagination);
  }
}
