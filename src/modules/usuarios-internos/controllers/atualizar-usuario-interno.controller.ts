/**
 * IMPORTS
 */
import { Body, Controller, Param, ParseIntPipe, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

// shared
import { Feature } from 'src/shared/auth/features';
import { Role } from 'src/shared/constants/roles';
import { RequireFeatures } from 'src/shared/decorators/features.decorator';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { ApiResponse } from 'src/shared/utils/api-response';

// dto / services
import { AtualizarUsuarioInternoDto } from '../dto/atualizar-usuario-interno.dto';
import { AtualizarUsuarioInternoService } from '../services/atualizar-usuario-interno.service';

/** Gerenciamento de usuários consultor, produção e recepção pelo backoffice (só admin). */
@ApiTags('usuarios-internos')
@ApiBearerAuth()
@Controller('usuarios-internos')
@Roles(Role.ADMIN)
@RequireFeatures(Feature.GERENCIAR_USUARIOS_INTERNOS)
export class AtualizarUsuarioInternoController {
  constructor(private readonly atualizarUsuarioInternoService: AtualizarUsuarioInternoService) {}

  @Put(':id')
  @ApiParam({ name: 'id', description: 'ID do usuário interno' })
  @ApiOperation({ summary: 'Atualiza dados do usuário interno (e-mail não é alterável)' })
  async atualizarUsuarioInterno(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: AtualizarUsuarioInternoDto,
  ) {
    const data = await this.atualizarUsuarioInternoService.execute(BigInt(id), body);
    return ApiResponse.success('Usuário interno atualizado com sucesso!', data);
  }
}
