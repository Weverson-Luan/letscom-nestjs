import { Module } from '@nestjs/common';
import { DashboardController } from './controllers/dashboard.controller';
import { DashboardRepository } from './repositories/dashboard.repository';
import { DashboardService } from './services/dashboard.service';
import { ListarAtividadesRecentesDashboardService } from './services/listar-atividades-recentes-dashboard.service';

@Module({
  controllers: [DashboardController],
  providers: [DashboardService, ListarAtividadesRecentesDashboardService, DashboardRepository],
  exports: [DashboardService],
})
export class DashboardModule {}
