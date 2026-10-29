/**
 * IMPORTS
 */
import { Controller, Delete, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

// shared
import { Feature } from 'src/shared/auth/features';
import { Role } from 'src/shared/constants/roles';
import { RequireFeatures } from 'src/shared/decorators/features.decorator';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { ApiResponse } from 'src/shared/utils/api-response';

// services
import { ExcluirUsuarioClienteService } from '../services/excluir-usuario-cliente.service';

@ApiTags('usuarios-cliente')
@ApiBearerAuth()
@Controller('usuarios-cliente')
export class ExcluirUsuarioClienteController {
  constructor(private readonly excluirUsuarioClienteService: ExcluirUsuarioClienteService) {}

  @Delete(':id')
  @RequireFeatures(Feature.INATIVAR_USUARIO_CLIENTE)
  @Roles(Role.ADMIN, Role.PRODUCAO, Role.CONSULTOR)
  @ApiParam({ name: 'id', description: 'ID do usuário-cliente' })
  @ApiOperation({ summary: 'Exclui um usuário-cliente' })
  async excluirUsuarioCliente(@Param('id') id: string) {
    await this.excluirUsuarioClienteService.execute(BigInt(id));
    return ApiResponse.success('Usuário do cliente removido com sucesso!', []);
  }
}
