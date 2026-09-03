import { Module } from '@nestjs/common';
import { TipoEntregaController } from './controllers/tipo-entrega.controller';
import { TipoEntregaRepository } from './repositories/tipo-entrega.repository';
import { TipoEntregaUserRepository } from './repositories/tipo-entrega-user.repository';
import { TipoEntregaUserService } from './services/tipo-entrega-user.service';
import { TipoEntregaService } from './services/tipo-entrega.service';

@Module({
  controllers: [TipoEntregaController],
  providers: [
    TipoEntregaService,
    TipoEntregaUserService,
    TipoEntregaRepository,
    TipoEntregaUserRepository,
  ],
  exports: [TipoEntregaService, TipoEntregaUserService],
})
export class TiposEntregaModule {}
