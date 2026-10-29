/**
 * IMPORTS
 */
import { Module } from '@nestjs/common';

// controller
import { EnviarFotosRemessaController } from './controllers/enviar-fotos-remessa.controller';
import { EnviarPlanilhaRemessaController } from './controllers/enviar-planilha-remessa.controller';

// service / uploads
import { EnviarFotosRemessaService } from './services/enviar-fotos-remessa.service';
import { EnviarPlanilhaRemessaService } from './services/enviar-planilha-remessa.service';

// repository / uploads
import { EnviarFotosRemessaRepository } from './repositories/enviar-fotos-remessa.repository';
import { EnviarPlanilhaRemessaRepository } from './repositories/enviar-planilha-remessa.repository';

/**
 * Uploads avulsos (fotos ZIP / planilha) para remessas existentes.
 * O fluxo principal de solicitação (POST /remessas) continua em RemessasModule.
 */
@Module({
  controllers: [EnviarFotosRemessaController, EnviarPlanilhaRemessaController],
  providers: [
    EnviarFotosRemessaService,
    EnviarPlanilhaRemessaService,
    EnviarFotosRemessaRepository,
    EnviarPlanilhaRemessaRepository,
  ],
})

/**
 * EXPORTS
 */
export class UploadsModule {}
