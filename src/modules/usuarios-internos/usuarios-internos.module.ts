import { Module } from '@nestjs/common';
import { UsuarioInternoController } from './controllers/usuario-interno.controller';
import { UsuarioInternoRepository } from './repositories/usuario-interno.repository';
import { AtualizarUsuarioInternoService } from './services/atualizar-usuario-interno.service';
import { BuscarUsuarioInternoService } from './services/buscar-usuario-interno.service';
import { CriarUsuarioInternoService } from './services/criar-usuario-interno.service';
import { ListarUsuariosInternosService } from './services/listar-usuarios-internos.service';

@Module({
  controllers: [UsuarioInternoController],
  providers: [
    ListarUsuariosInternosService,
    BuscarUsuarioInternoService,
    CriarUsuarioInternoService,
    AtualizarUsuarioInternoService,
    UsuarioInternoRepository,
  ],
})
export class UsuariosInternosModule {}
