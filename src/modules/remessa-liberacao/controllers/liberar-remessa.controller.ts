import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from 'src/shared/constants/roles';
import { AuthUser, CurrentUser } from 'src/shared/decorators/current-user.decorator';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { ApiResponse } from 'src/shared/utils/api-response';
import { LiberarRemessaBalcaoDto } from '../dto/liberar-remessa-balcao.dto';
import { LiberarRemessasLoteDto } from '../dto/liberar-remessas-lote.dto';
import { LiberarRemessasLoteBalcaoService } from '../services/liberar-remessas-lote-balcao.service';
import { RemessaLiberadaBalcaoService } from '../services/remessa-liberada-balcao.service';

const ROLES = [Role.ADMIN, Role.PRODUCAO, Role.CONSULTOR, Role.EXPEDICAO] as const;

/**
 * Liberação de remessa no balcão (expedição).
 * Prefixo Laravel: liberar-remessa
 */
@ApiTags('liberar-remessa')
@ApiBearerAuth()
@Controller('liberar-remessa')
export class LiberarRemessaController {
  constructor(
    private readonly service: RemessaLiberadaBalcaoService,
    private readonly loteService: LiberarRemessasLoteBalcaoService,
  ) {}

  @Post('lote')
  @Roles(...ROLES)
  @ApiOperation({ summary: 'Libera remessas em lote para o balcão (atualiza status)' })
  async liberarEmLote(
    @Body() dto: LiberarRemessasLoteDto,
    @CurrentUser() user: AuthUser,
  ) {
    const data = await this.loteService.liberarEmLote(dto, user);
    return ApiResponse.success('Remessas liberadas com sucesso!', data, null, 201);
  }

  @Post()
  @Roles(...ROLES)
  @ApiOperation({
    summary: 'Libera uma remessa para o balcão (não altera status da remessa)',
  })
  async liberar(
    @Body() dto: LiberarRemessaBalcaoDto,
    @CurrentUser() user: AuthUser,
  ) {
    const data = await this.service.liberarRemessaParaBalcao(dto, user);
    return ApiResponse.success('Remessa liberada com sucesso!', data, null, 201);
  }

  @Get()
  @Roles(...ROLES)
  @ApiOperation({ summary: 'Lista todas as liberações de remessa (balcão)' })
  async listar() {
    const data = await this.service.listarLiberacoes();
    return ApiResponse.success('Liberações carregadas com sucesso!', data);
  }

  @Get(':remessaId')
  @Roles(...ROLES)
  @ApiOperation({ summary: 'Busca liberação de remessa por remessa_id' })
  async porRemessa(@Param('remessaId') remessaId: string) {
    const data = await this.service.listarPorRemessa(BigInt(remessaId));
    return ApiResponse.success('Liberação carregada com sucesso!', data);
  }
}
