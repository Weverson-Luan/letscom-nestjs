import { Module } from '@nestjs/common';
import { UserAtendimentoController } from './controllers/user-atendimento.controller';
import { UserAtendimentoRepository } from './repositories/user-atendimento.repository';
import { UserAtendimentoService } from './services/user-atendimento.service';

@Module({
  controllers: [UserAtendimentoController],
  providers: [UserAtendimentoService, UserAtendimentoRepository],
})
export class UsersAtendimentosModule {}
