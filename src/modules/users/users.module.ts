/**
 * IMPORTS
 */
import { Module } from '@nestjs/common';

// controller
import { UserFeatureFlagController } from './controllers/user-feature-flag.controller';
import { BuscarDadosUsuarioController } from './controllers/buscar-dados-usuario.controller';
import { ListarConsultoresController } from './controllers/listar-consultores.controller';
import { ListarClientesController } from './controllers/listar-clientes.controller';
import { BuscarUsuarioController } from './controllers/buscar-usuario.controller';
import { CriarUsuarioController } from './controllers/criar-usuario.controller';
import { CriarClienteCompletoController } from './controllers/criar-cliente-completo.controller';
import { AtualizarUsuarioController } from './controllers/atualizar-usuario.controller';
import { ExcluirUsuarioController } from './controllers/excluir-usuario.controller';

// service / users
import { ListarClientesService } from './services/listar-clientes.service';
import { ListarConsultoresService } from './services/listar-consultores.service';
import { BuscarUsuarioService } from './services/buscar-usuario.service';
import { BuscarDadosUsuarioService } from './services/buscar-dados-usuario.service';
import { CriarUsuarioService } from './services/criar-usuario.service';
import { AtualizarUsuarioService } from './services/atualizar-usuario.service';
import { ExcluirUsuarioService } from './services/excluir-usuario.service';
import { CreateFullClientService } from './services/create-full-client.service';
import { UserFeatureFlagService } from './services/user-feature-flag.service';

// repository / users
import { ListarClientesRepository } from './repositories/listar-clientes.repository';
import { ListarConsultoresRepository } from './repositories/listar-consultores.repository';
import { BuscarUsuarioRepository } from './repositories/buscar-usuario.repository';
import { BuscarDadosUsuarioRepository } from './repositories/buscar-dados-usuario.repository';
import { CriarUsuarioRepository } from './repositories/criar-usuario.repository';
import { AtualizarUsuarioRepository } from './repositories/atualizar-usuario.repository';
import { ExcluirUsuarioRepository } from './repositories/excluir-usuario.repository';

// mappers / users
import { UsersResponseMapper } from './mappers/users-response.mapper';

@Module({
  // A ordem importa: controllers com rotas literais ('dados/feature-flags', 'dados',
  // 'consultores') são registrados antes dos que têm ':id', evitando conflito.
  controllers: [
    UserFeatureFlagController,
    BuscarDadosUsuarioController,
    ListarConsultoresController,
    ListarClientesController,
    CriarUsuarioController,
    CriarClienteCompletoController,
    BuscarUsuarioController,
    AtualizarUsuarioController,
    ExcluirUsuarioController,
  ],
  providers: [
    ListarClientesService,
    ListarConsultoresService,
    BuscarUsuarioService,
    BuscarDadosUsuarioService,
    CriarUsuarioService,
    AtualizarUsuarioService,
    ExcluirUsuarioService,
    UserFeatureFlagService,
    CreateFullClientService,
    ListarClientesRepository,
    ListarConsultoresRepository,
    BuscarUsuarioRepository,
    BuscarDadosUsuarioRepository,
    CriarUsuarioRepository,
    AtualizarUsuarioRepository,
    ExcluirUsuarioRepository,
    UsersResponseMapper,
  ],
})

/**
 * EXPORTS
 */
export class UsersModule {}
