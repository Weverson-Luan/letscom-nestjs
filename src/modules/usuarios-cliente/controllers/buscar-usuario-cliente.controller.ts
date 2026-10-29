/**
 * IMPORTS
 */
import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

// shared
import { Feature } from 'src/shared/auth/features';
import { Role } from 'src/shared/constants/roles';
import { RequireFeatures } from 'src/shared/decorators/features.decorator';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { ApiResponse } from 'src/shared/utils/api-response';

// services / mappers
import { BuscarUsuarioClienteService } from '../services/buscar-usuario-cliente.service';
import { mapUserCliente } from '../mappers/user-cliente.mapper';

@ApiTags('usuarios-cliente')
@ApiBearerAuth()
@Controller('usuarios-cliente')
export class BuscarUsuarioClienteController {
  constructor(private readonly buscarUsuarioClienteService: BuscarUsuarioClienteService) {}

  @Get(':id')
  @RequireFeatures(Feature.VISUALIZAR_USUARIO_CLIENTE)
  @Roles(Role.ADMIN, Role.PRODUCAO, Role.CONSULTOR)
  @ApiParam({ name: 'id', description: 'ID do usuário-cliente' })
  @ApiOperation({ summary: 'Detalha um usuário-cliente' })
  async buscarUsuarioCliente(@Param('id') id: string) {
    const usuario = await this.buscarUsuarioClienteService.execute(BigInt(id));
    return ApiResponse.success(
      'Usuário do cliente carregado com sucesso!',
      usuario ? mapUserCliente(usuario) : null,
    );
  }
}
