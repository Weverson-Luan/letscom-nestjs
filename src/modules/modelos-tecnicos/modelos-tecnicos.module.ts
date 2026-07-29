import { Module } from '@nestjs/common';
import { CamposVariaveisController } from './controllers/campos-variaveis.controller';
import { ModeloTecnicoController } from './controllers/modelo-tecnico.controller';
import { ModeloTecnicoMapper } from './mappers/modelo-tecnico.mapper';
import { CamposVariaveisRepository } from './repositories/campos-variaveis.repository';
import { ModeloTecnicoRepository } from './repositories/modelo-tecnico.repository';
import { CamposVariaveisService } from './services/campos-variaveis.service';
import { ModeloTecnicoService } from './services/modelo-tecnico.service';

@Module({
  controllers: [ModeloTecnicoController, CamposVariaveisController],
  providers: [
    ModeloTecnicoService,
    ModeloTecnicoRepository,
    ModeloTecnicoMapper,
    CamposVariaveisService,
    CamposVariaveisRepository,
  ],
  exports: [ModeloTecnicoService, CamposVariaveisService],
})
export class ModelosTecnicosModule {}
