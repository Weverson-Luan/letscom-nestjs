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

// dto / services / mappers
import { CreateUserClienteDto } from '../dto/create-user-cliente.dto';
import { CriarUsuarioClienteService } from '../services/criar-usuario-cliente.service';
import { mapUserCliente } from '../mappers/user-cliente.mapper';

@ApiTags('usuarios-cliente')
@ApiBearerAuth()
@Controller('usuarios-cliente')
export class CriarUsuarioClienteController {
  constructor(private readonly criarUsuarioClienteService: CriarUsuarioClienteService) {}

  @Post()
  @RequireFeatures(Feature.CRIAR_USUARIO_CLIENTE)
  @Roles(Role.ADMIN, Role.PRODUCAO, Role.CONSULTOR)
  @HttpCode(201)
  @ApiOperation({ summary: 'Cria um usuário-cliente' })
  async criarUsuarioCliente(@Body() body: CreateUserClienteDto) {
    const usuario = await this.criarUsuarioClienteService.execute(
      body as unknown as Record<string, any>,
    );
    return ApiResponse.success(
      'Usuário do cliente criado com sucesso!',
      mapUserCliente(usuario),
      null,
      201,
    );
  }
}
