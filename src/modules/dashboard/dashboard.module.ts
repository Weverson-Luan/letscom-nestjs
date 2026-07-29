import { Module } from '@nestjs/common';
import { DashboardController } from './controllers/dashboard.controller';
import { ActivityLogRepository } from './repositories/activity-log.repository';
import { DashboardRepository } from './repositories/dashboard.repository';
import { DashboardService } from './services/dashboard.service';

@Module({
  controllers: [DashboardController],
  providers: [DashboardService, DashboardRepository, ActivityLogRepository],
  exports: [DashboardService],
})
export class DashboardModule {}
