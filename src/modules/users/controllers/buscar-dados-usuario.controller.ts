/**
 * IMPORTS
 */
import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

// shared / decorators
import { AuthUser, CurrentUser } from 'src/shared/decorators/current-user.decorator';

// services
import { BuscarDadosUsuarioService } from '../services/buscar-dados-usuario.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class BuscarDadosUsuarioController {
  constructor(private readonly buscarDadosUsuarioService: BuscarDadosUsuarioService) {}

  @Get('dados')
  @ApiOperation({ summary: 'Dados do usuário autenticado (dashboard)' })
  async buscarDadosUsuario(@CurrentUser() user: AuthUser) {
    const data = await this.buscarDadosUsuarioService.execute(user);
    return { code: 200, message: 'Dados do usuário carregados com sucesso!', data };
  }
}
