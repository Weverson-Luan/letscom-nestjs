import { Controller, HttpCode, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from 'src/shared/decorators/current-user.decorator';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { ApiResponse } from 'src/shared/utils/api-response';
import { PAPEIS_CONVITE_CONVERSA } from '../clientes-anotacoes.constants';
import { AceitarConviteConversaService } from '../services/aceitar-convite-conversa.service';
import { RecusarConviteConversaService } from '../services/recusar-convite-conversa.service';

/**
 * Resposta ao convite recebido por notificação (equipe ou lado do cliente). Sem feature flag:
 * só o próprio convidado responde, e o acesso à conversa continua exigindo a feature.
 */
@ApiTags('clientes-anotacoes')
@ApiBearerAuth()
@ApiParam({ name: 'id', description: 'ID do convite (participante)' })
@Controller('convites-conversa/:id')
@Roles(...PAPEIS_CONVITE_CONVERSA)
export class ConviteConversaController {
  constructor(
    private readonly aceitarConvite: AceitarConviteConversaService,
    private readonly recusarConvite: RecusarConviteConversaService,
  ) {}

  @Post('aceitar')
  @HttpCode(200)
  @ApiOperation({ summary: 'Aceita o convite para a conversa' })
  async aceitar(@Param('id', ParseIntPipe) id: number, @CurrentUser() usuario: AuthUser) {
    const data = await this.aceitarConvite.execute(BigInt(id), usuario);
    return ApiResponse.success('Convite aceito!', data);
  }

  @Post('recusar')
  @HttpCode(200)
  @ApiOperation({ summary: 'Recusa o convite para a conversa' })
  async recusar(@Param('id', ParseIntPipe) id: number, @CurrentUser() usuario: AuthUser) {
    const data = await this.recusarConvite.execute(BigInt(id), usuario);
    return ApiResponse.success('Convite recusado.', data);
  }
}
