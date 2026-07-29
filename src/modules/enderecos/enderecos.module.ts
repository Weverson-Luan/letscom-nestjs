import { Module } from '@nestjs/common';
import { EnderecoController } from './controllers/endereco.controller';
import { EnderecoRepository } from './repositories/endereco.repository';
import { EnderecoService } from './services/endereco.service';

@Module({
  controllers: [EnderecoController],
  providers: [EnderecoService, EnderecoRepository],
  exports: [EnderecoService],
})
export class EnderecosModule {}
