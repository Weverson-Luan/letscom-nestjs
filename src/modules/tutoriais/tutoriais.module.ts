/**
 * IMPORTS
 */
import { Module } from '@nestjs/common';

// controllers
import { BuscarVideoTutorialController } from './controllers/buscar-video-tutorial.controller';

// services
import { BuscarVideoTutorialService } from './services/buscar-video-tutorial.service';

@Module({
  controllers: [BuscarVideoTutorialController],
  providers: [BuscarVideoTutorialService],
})

/**
 * EXPORTS
 */
export class TutoriaisModule {}
