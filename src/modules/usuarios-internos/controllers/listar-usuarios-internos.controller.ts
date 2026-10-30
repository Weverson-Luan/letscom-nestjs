/**
 * IMPORTS
 */
import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

// shared
import { Feature } from 'src/shared/auth/features';
import { Role } from 'src/shared/constants/roles';
import { RequireFeatures } from 'src/shared/decorators/features.decorator';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { ApiResponse } from 'src/shared/utils/api-response';

// dto / services
import { ListarUsuariosInternosQueryDto } from '../dto/listar-usuarios-internos-query.dto';
import { ListarUsuariosInternosService } from '../services/listar-usuarios-internos.service';

/** Gerenciamento de usuários consultor, produção e recepção pelo backoffice (só admin). */
@ApiTags('usuarios-internos')
@ApiBearerAuth()
@Controller('usuarios-internos')
@Roles(Role.ADMIN)
@RequireFeatures(Feature.GERENCIAR_USUARIOS_INTERNOS)
export class ListarUsuariosInternosController {
  constructor(private readonly listarUsuariosInternosService: ListarUsuariosInternosService) {}

  @Get()
  @ApiOperation({ summary: 'Lista usuários internos (consultor, produção, recepção)' })
  async listarUsuariosInternos(@Query() query: ListarUsuariosInternosQueryDto) {
    const { data, pagination } = await this.listarUsuariosInternosService.execute(query);
    return ApiResponse.success('Usuários internos carregados com sucesso!', data, pagination);
  }
}
