/**
 * IMPORTS
 */
import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

// shared
import { Feature } from 'src/shared/auth/features';
import { Role } from 'src/shared/constants/roles';
import { RequireFeatures } from 'src/shared/decorators/features.decorator';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { ApiResponse } from 'src/shared/utils/api-response';

// services
import { BuscarUsuarioInternoService } from '../services/buscar-usuario-interno.service';

/** Gerenciamento de usuários consultor, produção e recepção pelo backoffice (só admin). */
@ApiTags('usuarios-internos')
@ApiBearerAuth()
@Controller('usuarios-internos')
@Roles(Role.ADMIN)
@RequireFeatures(Feature.GERENCIAR_USUARIOS_INTERNOS)
export class BuscarUsuarioInternoController {
  constructor(private readonly buscarUsuarioInternoService: BuscarUsuarioInternoService) {}

  @Get(':id')
  @ApiParam({ name: 'id', description: 'ID do usuário interno' })
  @ApiOperation({ summary: 'Detalha um usuário interno' })
  async buscarUsuarioInterno(@Param('id', ParseIntPipe) id: number) {
    const data = await this.buscarUsuarioInternoService.execute(BigInt(id));
    return ApiResponse.success('Usuário interno carregado com sucesso!', data);
  }
}
