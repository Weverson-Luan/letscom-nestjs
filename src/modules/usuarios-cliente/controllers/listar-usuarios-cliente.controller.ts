/**
 * IMPORTS
 */
import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

// shared
import { Feature } from 'src/shared/auth/features';
import { Role } from 'src/shared/constants/roles';
import { RequireFeatures } from 'src/shared/decorators/features.decorator';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { ApiResponse } from 'src/shared/utils/api-response';

// services / mappers
import { ListarUsuariosClienteService } from '../services/listar-usuarios-cliente.service';
import { mapUserCliente } from '../mappers/user-cliente.mapper';

@ApiTags('usuarios-cliente')
@ApiBearerAuth()
@Controller('usuarios-cliente')
export class ListarUsuariosClienteController {
  constructor(private readonly listarUsuariosClienteService: ListarUsuariosClienteService) {}

  @Get()
  @RequireFeatures(Feature.VISUALIZAR_USUARIO_CLIENTE)
  @Roles(Role.ADMIN, Role.PRODUCAO, Role.CONSULTOR, Role.CLIENTE, Role.SUBORDINADO)
  @ApiOperation({ summary: 'Lista todos os usuários-cliente' })
  async listarUsuariosCliente() {
    const usuarios = await this.listarUsuariosClienteService.execute();
    return ApiResponse.success(
      'Usuários do cliente carregados com sucesso!',
      usuarios.map(mapUserCliente),
    );
  }
}
