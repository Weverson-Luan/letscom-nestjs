import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from 'src/shared/constants/roles';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { ApiResponse } from 'src/shared/utils/api-response';
import { DashboardService } from '../services/dashboard.service';
import { ListarAtividadesRecentesDashboardService } from '../services/listar-atividades-recentes-dashboard.service';
import { ListarAtividadesRecentesQueryDto } from '../dto/listar-atividades-recentes-query.dto';
import { Feature } from 'src/shared/auth/features';
import { RequireFeatures } from 'src/shared/decorators/features.decorator';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly service: DashboardService,
    private readonly listarAtividadesRecentes: ListarAtividadesRecentesDashboardService,
  ) {}

  @Get('overview')
  @RequireFeatures(Feature.ACESSAR_BACKOFFICE)
  @Roles(Role.ADMIN, Role.PRODUCAO, Role.CONSULTOR)
  @ApiOperation({ summary: 'KPIs do dashboard' })
  async overview() {
    const data = await this.service.overview();
    return ApiResponse.success('Overview carregado com sucesso', data);
  }

  @Get('atividades-recentes')
  @RequireFeatures(Feature.ACESSAR_BACKOFFICE)
  @Roles(Role.ADMIN, Role.PRODUCAO, Role.CONSULTOR)
  @ApiOperation({ summary: 'Atividades recentes do dashboard (paginadas)' })
  async atividadesRecentes(@Query() query: ListarAtividadesRecentesQueryDto) {
    const { data, pagination } = await this.listarAtividadesRecentes.execute(query);
    return ApiResponse.success('Atividades recentes carregadas com sucesso!', data, pagination);
  }
}
