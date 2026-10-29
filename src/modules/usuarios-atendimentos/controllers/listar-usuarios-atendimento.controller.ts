/**
 * IMPORTS
 */
import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

// shared
import { Feature } from 'src/shared/auth/features';
import { RequireFeatures } from 'src/shared/decorators/features.decorator';

// services
import { ListarUsuariosAtendimentoService } from '../services/listar-usuarios-atendimento.service';

/** A rota continua 'users-atendimentos' (contrato com o front). */
@ApiTags('users-atendimentos')
@ApiBearerAuth()
@Controller('users-atendimentos')
@RequireFeatures(Feature.ACESSAR_ADMIN)
export class ListarUsuariosAtendimentoController {
  constructor(
    private readonly listarUsuariosAtendimentoService: ListarUsuariosAtendimentoService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista usuários de atendimento' })
  listarUsuariosAtendimento() {
    return this.listarUsuariosAtendimentoService.execute();
  }
}
