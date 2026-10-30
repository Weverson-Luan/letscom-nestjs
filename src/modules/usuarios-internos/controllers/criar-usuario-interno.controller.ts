/**
 * IMPORTS
 */
import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

// shared
import { Feature } from 'src/shared/auth/features';
import { Role } from 'src/shared/constants/roles';
import { RequireFeatures } from 'src/shared/decorators/features.decorator';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { ApiResponse } from 'src/shared/utils/api-response';

// dto / services
import { CriarUsuarioInternoDto } from '../dto/criar-usuario-interno.dto';
import { CriarUsuarioInternoService } from '../services/criar-usuario-interno.service';

/** Gerenciamento de usuários consultor, produção e recepção pelo backoffice (só admin). */
@ApiTags('usuarios-internos')
@ApiBearerAuth()
@Controller('usuarios-internos')
@Roles(Role.ADMIN)
@RequireFeatures(Feature.GERENCIAR_USUARIOS_INTERNOS)
export class CriarUsuarioInternoController {
  constructor(private readonly criarUsuarioInternoService: CriarUsuarioInternoService) {}

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Cria um usuário interno' })
  async criarUsuarioInterno(@Body() body: CriarUsuarioInternoDto) {
    const data = await this.criarUsuarioInternoService.execute(body);
    return ApiResponse.success('Usuário interno criado com sucesso!', data, null, 201);
  }
}
