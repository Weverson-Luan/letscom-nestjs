import { Module } from '@nestjs/common';
import { ListarItensRemessaController } from './controllers/listar-itens-remessa.controller';
import { RemessaController } from './controllers/remessa.controller';
import { RemessaResponsabilidadeController } from './controllers/remessa-responsabilidade.controller';
import { RemessaStatusController } from './controllers/remessa-status.controller';
import { RemessasResponseMapper } from './mappers/remessas-response.mapper';
import { ListarItensRemessaRepository } from './repositories/listar-itens-remessa.repository';
import { RemessaRepository } from './repositories/remessa.repository';
import { RemessaStatusRepository } from './repositories/remessa-status.repository';
import { RemessaDownloadService } from './services/remessa-download.service';
import { RemessaResponsabilidadeService } from './services/remessa-responsabilidade.service';
import { ListarItensRemessaService } from './services/listar-itens-remessa.service';
import { RemessaService } from './services/remessa.service';
import { RemessaStatusService } from './services/remessa-status.service';
import { RemessasCacheService } from './services/remessas-cache.service';
import { SolicitacaoRemessaService } from './services/solicitacao-remessa.service';
import { SolicitarRemessaUseCase } from './services/helpers/solicitar-remessa.use-case';

@Module({
  controllers: [
    RemessaStatusController,
    RemessaResponsabilidadeController,
    ListarItensRemessaController,
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
    ListarItensRemessaService,
    ListarItensRemessaRepository,
  ],
  exports: [RemessaService, RemessaStatusService, RemessasCacheService],
})
export class RemessasModule {}
