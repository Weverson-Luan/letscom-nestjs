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

// services
import { BuscarUsuarioService } from '../services/buscar-usuario.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class BuscarUsuarioController {
  constructor(private readonly buscarUsuarioService: BuscarUsuarioService) {}

  @Get(':id')
  @RequireFeatures(Feature.VISUALIZAR_CLIENTE, Feature.EDITAR_CLIENTE)
  @Roles(
    Role.ADMIN,
    Role.PRODUCAO,
    Role.CONSULTOR,
    Role.RECEPCAO,
    Role.EXPEDICAO,
    Role.CLIENTE,
    Role.SUBORDINADO,
  )
  @ApiParam({ name: 'id', description: 'ID do usuário' })
  @ApiOperation({ summary: 'Busca um usuário por id' })
  async buscarPorUmUsuario(@Param('id') id: string) {
    const user = await this.buscarUsuarioService.execute(BigInt(id));
    return {
      code: 200,
      status: 'success',
      message: 'Usuários encontrado com sucesso!',
      data: user,
    };
  }
}
