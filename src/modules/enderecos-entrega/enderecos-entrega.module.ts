import { Module } from '@nestjs/common';
import { EnderecoRepository } from '../enderecos/repositories/endereco.repository';
import { EnderecoEntregaController } from './controllers/endereco-entrega.controller';
import { EnderecoEntregaService } from './services/endereco-entrega.service';

@Module({
  controllers: [EnderecoEntregaController],
  providers: [EnderecoEntregaService, EnderecoRepository],
})
export class EnderecosEntregaModule {}
