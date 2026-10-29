/**
 * IMPORTS
 */
import { Body, Controller, Param, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

// shared
import { Feature } from 'src/shared/auth/features';
import { RequireFeatures } from 'src/shared/decorators/features.decorator';

// dto / services
import { AtualizarUsuarioAtendimentoDto } from '../dto/atualizar-usuario-atendimento.dto';
import { AtualizarUsuarioAtendimentoService } from '../services/atualizar-usuario-atendimento.service';

/** A rota continua 'users-atendimentos' (contrato com o front). */
@ApiTags('users-atendimentos')
@ApiBearerAuth()
@Controller('users-atendimentos')
@RequireFeatures(Feature.ACESSAR_ADMIN)
export class AtualizarUsuarioAtendimentoController {
  constructor(
    private readonly atualizarUsuarioAtendimentoService: AtualizarUsuarioAtendimentoService,
  ) {}

  @Put(':id')
  @ApiParam({ name: 'id', description: 'ID do atendimento' })
  @ApiOperation({ summary: 'Atualiza um atendimento' })
  atualizarUsuarioAtendimento(
    @Param('id') id: string,
    @Body() body: AtualizarUsuarioAtendimentoDto,
  ) {
    return this.atualizarUsuarioAtendimentoService.execute(BigInt(id), body);
  }
}
