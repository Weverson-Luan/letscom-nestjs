import { Module } from '@nestjs/common';
import { RemessaController } from './controllers/remessa.controller';
import { RemessaResponsabilidadeController } from './controllers/remessa-responsabilidade.controller';
import { RemessaStatusController } from './controllers/remessa-status.controller';
import { RemessasResponseMapper } from './mappers/remessas-response.mapper';
import { RemessaRepository } from './repositories/remessa.repository';
import { RemessaStatusRepository } from './repositories/remessa-status.repository';
import { RemessaDownloadService } from './services/remessa-download.service';
import { RemessaResponsabilidadeService } from './services/remessa-responsabilidade.service';
import { RemessaService } from './services/remessa.service';
import { RemessaStatusService } from './services/remessa-status.service';
import { RemessasCacheService } from './services/remessas-cache.service';
import { SolicitacaoRemessaService } from './services/solicitacao-remessa.service';
import { SolicitarRemessaUseCase } from './use-cases/solicitar-remessa.use-case';

@Module({
  controllers: [
    RemessaStatusController,
    RemessaResponsabilidadeController,
    RemessaController,
  ],
  providers: [
    RemessaService,
    SolicitacaoRemessaService,
    RemessaStatusService,
    RemessaDownloadService,
    RemessaResponsabilidadeService,
    RemessasCacheService,
    RemessaRepository,
    RemessaStatusRepository,
    RemessasResponseMapper,
    SolicitarRemessaUseCase,
  ],
  exports: [RemessaService, RemessaStatusService],
})
export class RemessasModule {}
