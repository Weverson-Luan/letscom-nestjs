import { Module } from '@nestjs/common';
import { VideoTutorialController } from './controllers/video-tutorial.controller';
import { VideoTutorialService } from './services/video-tutorial.service';

@Module({
  controllers: [VideoTutorialController],
  providers: [VideoTutorialService],
})
export class TutorialsModule {}
