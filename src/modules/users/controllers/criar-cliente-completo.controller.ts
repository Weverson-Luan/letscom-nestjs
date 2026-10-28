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

// dto / services
import { CreateFullClientDto } from '../dto/create-full-client.dto';
import { CreateFullClientService } from '../services/create-full-client.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class CriarClienteCompletoController {
  constructor(private readonly createFullClientService: CreateFullClientService) {}

  @Post('cliente-completo')
  @RequireFeatures(Feature.CRIAR_CLIENTE)
  @Roles(Role.ADMIN, Role.PRODUCAO, Role.CONSULTOR)
  @HttpCode(201)
  @ApiOperation({ summary: 'Cria cliente + endereço + subordinados (transacional)' })
  async criarClienteCompleto(@Body() body: CreateFullClientDto) {
    const result = await this.createFullClientService.executar(body);
    return {
      status: 201,
      message: 'Cliente, endereço e usuários criados com sucesso!',
      data: {
        user: result.user,
        endereco: result.endereco,
        usuarios_cliente: result.usuarios_cliente,
      },
    };
  }
}
