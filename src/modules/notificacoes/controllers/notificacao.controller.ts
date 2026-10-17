import { Controller, Get, Param, ParseIntPipe, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from 'src/shared/decorators/current-user.decorator';
import { ApiResponse } from 'src/shared/utils/api-response';
import { ListarNotificacoesQueryDto } from '../dto/listar-notificacoes-query.dto';
import { ContarNotificacoesNaoLidasService } from '../services/contar-notificacoes-nao-lidas.service';
import { ListarNotificacoesService } from '../services/listar-notificacoes.service';
import { MarcarNotificacaoLidaService } from '../services/marcar-notificacao-lida.service';
import { MarcarTodasNotificacoesLidasService } from '../services/marcar-todas-notificacoes-lidas.service';

/**
 * Notificações do usuário logado (interno, cliente ou subordinado). Sem @Roles/@RequireFeatures:
 * cada um só enxerga a própria caixa, filtrada pelo token.
 */
@ApiTags('notificacoes')
@ApiBearerAuth()
@Controller('notificacoes')
export class NotificacaoController {
  constructor(
    private readonly listarNotificacoes: ListarNotificacoesService,
    private readonly contarNaoLidas: ContarNotificacoesNaoLidasService,
    private readonly marcarLida: MarcarNotificacaoLidaService,
    private readonly marcarTodasLidas: MarcarTodasNotificacoesLidasService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista as notificações do usuário logado' })
  async listar(@Query() query: ListarNotificacoesQueryDto, @CurrentUser() usuario: AuthUser) {
    const { data, pagination, nao_lidas } = await this.listarNotificacoes.execute(query, usuario);
    return {
      ...ApiResponse.success('Notificações carregadas com sucesso!', data, pagination),
      nao_lidas,
    };
  }

  @Get('nao-lidas/contagem')
  @ApiOperation({ summary: 'Quantidade de notificações não lidas (sino)' })
  async contar(@CurrentUser() usuario: AuthUser) {
    const data = await this.contarNaoLidas.execute(usuario);
    return ApiResponse.success('Contagem carregada com sucesso!', data);
  }

  @Patch('lidas')
  @ApiOperation({ summary: 'Marca todas as notificações como lidas' })
  async marcarTodas(@CurrentUser() usuario: AuthUser) {
    const data = await this.marcarTodasLidas.execute(usuario);
    return ApiResponse.success('Notificações marcadas como lidas.', data);
  }

  @Patch(':id/lida')
  @ApiParam({ name: 'id', description: 'ID da notificação' })
  @ApiOperation({ summary: 'Marca uma notificação como lida' })
  async marcar(@Param('id', ParseIntPipe) id: number, @CurrentUser() usuario: AuthUser) {
    const data = await this.marcarLida.execute(BigInt(id), usuario);
    return ApiResponse.success('Notificação marcada como lida.', data);
  }
}
