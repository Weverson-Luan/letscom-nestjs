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

// dto / services / mappers
import { CreateUserDto } from '../dto/create-user.dto';
import { CriarUsuarioService } from '../services/criar-usuario.service';
import { serializeUser } from 'src/modules/auth/mappers/auth-response.mapper';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class CriarUsuarioController {
  constructor(private readonly criarUsuarioService: CriarUsuarioService) {}

  @Post()
  @RequireFeatures(Feature.CRIAR_CLIENTE)
  @Roles(Role.ADMIN, Role.PRODUCAO, Role.CONSULTOR)
  @HttpCode(201)
  @ApiOperation({ summary: 'Cria um usuário' })
  async criarUsuario(@Body() body: CreateUserDto) {
    const user = await this.criarUsuarioService.execute(body as unknown as Record<string, any>);
    return {
      message: 'Usuário criado com sucesso!',
      data: serializeUser(user),
    };
  }
}
