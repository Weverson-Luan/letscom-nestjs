/**
 * IMPORTS
 */
import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

// shared
import { Feature } from 'src/shared/auth/features';
import { RequireFeatures } from 'src/shared/decorators/features.decorator';

// services
import { BuscarUsuarioAtendimentoService } from '../services/buscar-usuario-atendimento.service';

/** A rota continua 'users-atendimentos' (contrato com o front). */
@ApiTags('users-atendimentos')
@ApiBearerAuth()
@Controller('users-atendimentos')
@RequireFeatures(Feature.ACESSAR_ADMIN)
export class BuscarUsuarioAtendimentoController {
  constructor(private readonly buscarUsuarioAtendimentoService: BuscarUsuarioAtendimentoService) {}

  @Get(':id')
  @ApiParam({ name: 'id', description: 'ID do atendimento' })
  @ApiOperation({ summary: 'Detalha um atendimento' })
  buscarUsuarioAtendimento(@Param('id') id: string) {
    return this.buscarUsuarioAtendimentoService.execute(BigInt(id));
  }
}
