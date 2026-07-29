import { Module } from '@nestjs/common';
import { TecnologiaController } from './controllers/tecnologia.controller';
import { TecnologiaRepository } from './repositories/tecnologia.repository';
import { TecnologiaService } from './services/tecnologia.service';

@Module({
  controllers: [TecnologiaController],
  providers: [TecnologiaService, TecnologiaRepository],
  exports: [TecnologiaService],
})
export class TecnologiasModule {}
