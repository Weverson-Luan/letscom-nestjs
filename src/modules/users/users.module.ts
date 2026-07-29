import { Module } from '@nestjs/common';
import { UserController } from './controllers/user.controller';
import { UserFeatureFlagController } from './controllers/user-feature-flag.controller';
import { UsersResponseMapper } from './mappers/users-response.mapper';
import { UserRepository } from './repositories/user.repository';
import { UserFeatureFlagRepository } from './repositories/user-feature-flag.repository';
import { CreateFullClientService } from './services/create-full-client.service';
import { UserFeatureFlagService } from './services/user-feature-flag.service';
import { UserService } from './services/user.service';
import { CreateFullClientUseCase } from './use-cases/create-full-client.use-case';
import { CreateUserUseCase } from './use-cases/create-user.use-case';

@Module({
  // A ordem importa: o controller com rotas literais ('dados/feature-flags')
  // é registrado antes do UserController (que tem ':id'), evitando conflito.
  controllers: [UserFeatureFlagController, UserController],
  providers: [
    UserService,
    UserFeatureFlagService,
    CreateFullClientService,
    UserRepository,
    UserFeatureFlagRepository,
    UsersResponseMapper,
    CreateUserUseCase,
    CreateFullClientUseCase,
  ],
  exports: [UserService],
})
export class UsersModule {}
