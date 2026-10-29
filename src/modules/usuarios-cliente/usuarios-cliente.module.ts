/**
 * IMPORTS
 */
import { Module } from '@nestjs/common';

// controller
import { ListarUsuariosClienteController } from './controllers/listar-usuarios-cliente.controller';
import { ListarUsuariosDoClienteController } from './controllers/listar-usuarios-do-cliente.controller';
import { BuscarUsuarioClienteController } from './controllers/buscar-usuario-cliente.controller';
import { CriarUsuarioClienteController } from './controllers/criar-usuario-cliente.controller';
import { AtualizarUsuarioClienteController } from './controllers/atualizar-usuario-cliente.controller';
import { ExcluirUsuarioClienteController } from './controllers/excluir-usuario-cliente.controller';

// service / usuarios-cliente
import { ListarUsuariosClienteService } from './services/listar-usuarios-cliente.service';
import { ListarUsuariosDoClienteService } from './services/listar-usuarios-do-cliente.service';
import { BuscarUsuarioClienteService } from './services/buscar-usuario-cliente.service';
import { CriarUsuarioClienteService } from './services/criar-usuario-cliente.service';
import { AtualizarUsuarioClienteService } from './services/atualizar-usuario-cliente.service';
import { ExcluirUsuarioClienteService } from './services/excluir-usuario-cliente.service';

// repository / usuarios-cliente
import { ListarUsuariosClienteRepository } from './repositories/listar-usuarios-cliente.repository';
import { ListarUsuariosDoClienteRepository } from './repositories/listar-usuarios-do-cliente.repository';
import { BuscarUsuarioClienteRepository } from './repositories/buscar-usuario-cliente.repository';
import { CriarUsuarioClienteRepository } from './repositories/criar-usuario-cliente.repository';
import { AtualizarUsuarioClienteRepository } from './repositories/atualizar-usuario-cliente.repository';
import { ExcluirUsuarioClienteRepository } from './repositories/excluir-usuario-cliente.repository';

@Module({
  // A ordem importa: a rota literal 'cliente/:id' é registrada antes de ':id'.
  controllers: [
    ListarUsuariosClienteController,
    ListarUsuariosDoClienteController,
    CriarUsuarioClienteController,
    BuscarUsuarioClienteController,
    AtualizarUsuarioClienteController,
    ExcluirUsuarioClienteController,
  ],
  providers: [
    ListarUsuariosClienteService,
    ListarUsuariosDoClienteService,
    BuscarUsuarioClienteService,
    CriarUsuarioClienteService,
    AtualizarUsuarioClienteService,
    ExcluirUsuarioClienteService,
    ListarUsuariosClienteRepository,
    ListarUsuariosDoClienteRepository,
    BuscarUsuarioClienteRepository,
    CriarUsuarioClienteRepository,
    AtualizarUsuarioClienteRepository,
    ExcluirUsuarioClienteRepository,
  ],
})

/**
 * EXPORTS
 */
export class UsuariosClienteModule {}
