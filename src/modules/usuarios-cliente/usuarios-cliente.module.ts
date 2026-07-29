import { Module } from '@nestjs/common';
import { UserClienteController } from './controllers/user-cliente.controller';
import { UserClienteRepository } from './repositories/user-cliente.repository';
import { UserClienteService } from './services/user-cliente.service';

@Module({
  controllers: [UserClienteController],
  providers: [UserClienteService, UserClienteRepository],
  exports: [UserClienteService],
})
export class UsuariosClienteModule {}
