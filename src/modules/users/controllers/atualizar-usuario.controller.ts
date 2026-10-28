/**
 * IMPORTS
 */
import { Body, Controller, Param, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

// shared
import { Role } from 'src/shared/constants/roles';
import { AuthUser, CurrentUser } from 'src/shared/decorators/current-user.decorator';
import { Roles } from 'src/shared/decorators/roles.decorator';

// dto / services
import { UpdateUserDto } from '../dto/update-user.dto';
import { AtualizarUsuarioService } from '../services/atualizar-usuario.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class AtualizarUsuarioController {
  constructor(private readonly atualizarUsuarioService: AtualizarUsuarioService) {}

  @Put(':id')
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
  @ApiOperation({ summary: 'Atualiza um usuário' })
  async atualizarUsuario(
    @Param('id') id: string,
    @Body() body: UpdateUserDto,
    @CurrentUser() user: AuthUser,
  ) {
    await this.atualizarUsuarioService.execute(
      user,
      BigInt(id),
      body as unknown as Record<string, any>,
    );
    return { success: 'ok' };
  }
}
