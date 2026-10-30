/**
 * IMPORTS
 */
import { Module } from '@nestjs/common';

// controller
import { ListarUsuariosInternosController } from './controllers/listar-usuarios-internos.controller';
import { BuscarUsuarioInternoController } from './controllers/buscar-usuario-interno.controller';
import { CriarUsuarioInternoController } from './controllers/criar-usuario-interno.controller';
import { AtualizarUsuarioInternoController } from './controllers/atualizar-usuario-interno.controller';

// service / usuarios-internos
import { ListarUsuariosInternosService } from './services/listar-usuarios-internos.service';
import { BuscarUsuarioInternoService } from './services/buscar-usuario-interno.service';
import { CriarUsuarioInternoService } from './services/criar-usuario-interno.service';
import { AtualizarUsuarioInternoService } from './services/atualizar-usuario-interno.service';

// repository / usuarios-internos
import { ListarUsuariosInternosRepository } from './repositories/listar-usuarios-internos.repository';
import { UsuarioInternoComPapelRepository } from './repositories/usuario-interno-com-papel.repository';
import { CriarUsuarioInternoRepository } from './repositories/criar-usuario-interno.repository';
import { AtualizarUsuarioInternoRepository } from './repositories/atualizar-usuario-interno.repository';

@Module({
  controllers: [
    ListarUsuariosInternosController,
    CriarUsuarioInternoController,
    BuscarUsuarioInternoController,
    AtualizarUsuarioInternoController,
  ],
  providers: [
    ListarUsuariosInternosService,
    BuscarUsuarioInternoService,
    CriarUsuarioInternoService,
    AtualizarUsuarioInternoService,
    ListarUsuariosInternosRepository,
    UsuarioInternoComPapelRepository,
    CriarUsuarioInternoRepository,
    AtualizarUsuarioInternoRepository,
  ],
})

/**
 * EXPORTS
 */
export class UsuariosInternosModule {}
