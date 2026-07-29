import { Module } from '@nestjs/common';
import { FeatureFlagController } from './controllers/feature-flag.controller';
import { FeatureFlagRepository } from './repositories/feature-flag.repository';
import { FeatureFlagService } from './services/feature-flag.service';

@Module({
  controllers: [FeatureFlagController],
  providers: [FeatureFlagService, FeatureFlagRepository],
  exports: [FeatureFlagService],
})
export class FeatureFlagsModule {}
