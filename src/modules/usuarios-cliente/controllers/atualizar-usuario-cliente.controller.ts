/**
 * IMPORTS
 */
import { Body, Controller, Param, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

// shared
import { Role } from 'src/shared/constants/roles';
import { AuthUser, CurrentUser } from 'src/shared/decorators/current-user.decorator';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { ApiResponse } from 'src/shared/utils/api-response';

// dto / services / mappers
import { UpdateUserClienteDto } from '../dto/update-user-cliente.dto';
import { AtualizarUsuarioClienteService } from '../services/atualizar-usuario-cliente.service';
import { mapUserCliente } from '../mappers/user-cliente.mapper';

@ApiTags('usuarios-cliente')
@ApiBearerAuth()
@Controller('usuarios-cliente')
export class AtualizarUsuarioClienteController {
  constructor(private readonly atualizarUsuarioClienteService: AtualizarUsuarioClienteService) {}

  /** As features exigidas dependem dos campos enviados — checadas no service. */
  @Put(':id')
  @Roles(Role.ADMIN, Role.PRODUCAO, Role.CONSULTOR)
  @ApiParam({ name: 'id', description: 'ID do usuário-cliente' })
  @ApiOperation({ summary: 'Atualiza um usuário-cliente' })
  async atualizarUsuarioCliente(
    @Param('id') id: string,
    @Body() body: UpdateUserClienteDto,
    @CurrentUser() autenticado: AuthUser,
  ) {
    const usuario = await this.atualizarUsuarioClienteService.execute(
      autenticado,
      BigInt(id),
      body as unknown as Record<string, any>,
    );
    return ApiResponse.success(
      'Usuário do cliente atualizado com sucesso!',
      mapUserCliente(usuario),
    );
  }
}
