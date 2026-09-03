import { Module } from '@nestjs/common';
import { EntregaClienteController } from './controllers/entrega-cliente.controller';
import { EntregaClienteRepository } from './repositories/entrega-cliente.repository';
import { EntregaClienteService } from './services/entrega-cliente.service';

@Module({
  controllers: [EntregaClienteController],
  providers: [EntregaClienteService, EntregaClienteRepository],
})
export class EntregasClienteModule {}
