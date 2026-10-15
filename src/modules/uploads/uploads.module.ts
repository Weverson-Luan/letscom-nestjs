import { Module } from '@nestjs/common';
import { RemessaUploadsController } from './controllers/remessa-uploads.controller';
import { RemessaUploadService } from './services/remessa-upload.service';

/**
 * Módulo de uploads avulsos (fotos ZIP / planilha) para remessas existentes.
 * O fluxo principal de solicitação (POST /remessas) continua em RemessasModule.
 */
@Module({
  controllers: [RemessaUploadsController],
  providers: [RemessaUploadService],
  exports: [RemessaUploadService],
})
export class UploadsModule {}
