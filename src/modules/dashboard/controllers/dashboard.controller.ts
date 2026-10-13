import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from 'src/shared/constants/roles';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { ApiResponse } from 'src/shared/utils/api-response';
import { DashboardAtividadesQueryDto } from '../dto/atividades-query.dto';
import { DashboardService } from '../services/dashboard.service';
import { Feature } from 'src/shared/auth/features';
import { RequireFeatures } from 'src/shared/decorators/features.decorator';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('overview')
  @RequireFeatures(Feature.ACESSAR_BACKOFFICE)
  @Roles(Role.ADMIN, Role.PRODUCAO, Role.CONSULTOR)
  @ApiOperation({ summary: 'KPIs e atividades recentes do dashboard' })
  async overview() {
    const data = await this.service.overview();
    return ApiResponse.success('Overview carregado com sucesso', data);
  }

  @Get('atividades')
  @RequireFeatures(Feature.ACESSAR_ATIVIDADES)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Lista activity logs (auditoria)' })
  async atividades(@Query() query: DashboardAtividadesQueryDto) {
    const { data, pagination } = await this.service.listarAtividades(
      query as unknown as Record<string, unknown>,
    );
    return ApiResponse.success(
      'Atividades carregadas com sucesso!',
      data,
      pagination,
    );
  }
}
