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

// services
import { ExcluirUsuarioService } from '../services/excluir-usuario.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class ExcluirUsuarioController {
  constructor(private readonly excluirUsuarioService: ExcluirUsuarioService) {}

  @Delete(':id')
  @RequireFeatures(Feature.INATIVAR_CLIENTE)
  @Roles(Role.ADMIN, Role.CONSULTOR)
  @ApiParam({ name: 'id', description: 'ID do usuário' })
  @ApiOperation({ summary: 'Exclui (soft delete) um usuário' })
  async excluirUsuario(@Param('id') id: string) {
    const success = await this.excluirUsuarioService.execute(BigInt(id));
    return { success };
  }
}
