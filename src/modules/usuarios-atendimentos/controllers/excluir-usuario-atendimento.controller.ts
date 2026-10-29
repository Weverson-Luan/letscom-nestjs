/**
 * IMPORTS
 */
import { Controller, Delete, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

// shared
import { Feature } from 'src/shared/auth/features';
import { RequireFeatures } from 'src/shared/decorators/features.decorator';

// services
import { ExcluirUsuarioAtendimentoService } from '../services/excluir-usuario-atendimento.service';

/** A rota continua 'users-atendimentos' (contrato com o front). */
@ApiTags('users-atendimentos')
@ApiBearerAuth()
@Controller('users-atendimentos')
@RequireFeatures(Feature.ACESSAR_ADMIN)
export class ExcluirUsuarioAtendimentoController {
  constructor(
    private readonly excluirUsuarioAtendimentoService: ExcluirUsuarioAtendimentoService,
  ) {}

  @Delete(':id')
  @ApiParam({ name: 'id', description: 'ID do atendimento' })
  @ApiOperation({ summary: 'Remove um atendimento' })
  async excluirUsuarioAtendimento(@Param('id') id: string) {
    await this.excluirUsuarioAtendimentoService.execute(BigInt(id));
    return { message: 'Atendimento removido com sucesso.' };
  }
}
