/**
 * IMPORTS
 */
import { Module } from '@nestjs/common';

// controller
import { ListarUsuariosAtendimentoController } from './controllers/listar-usuarios-atendimento.controller';
import { BuscarUsuarioAtendimentoController } from './controllers/buscar-usuario-atendimento.controller';
import { CriarUsuarioAtendimentoController } from './controllers/criar-usuario-atendimento.controller';
import { AtualizarUsuarioAtendimentoController } from './controllers/atualizar-usuario-atendimento.controller';
import { ExcluirUsuarioAtendimentoController } from './controllers/excluir-usuario-atendimento.controller';

// service / usuarios-atendimentos
import { ListarUsuariosAtendimentoService } from './services/listar-usuarios-atendimento.service';
import { BuscarUsuarioAtendimentoService } from './services/buscar-usuario-atendimento.service';
import { CriarUsuarioAtendimentoService } from './services/criar-usuario-atendimento.service';
import { AtualizarUsuarioAtendimentoService } from './services/atualizar-usuario-atendimento.service';
import { ExcluirUsuarioAtendimentoService } from './services/excluir-usuario-atendimento.service';

// repository / usuarios-atendimentos
import { ListarUsuariosAtendimentoRepository } from './repositories/listar-usuarios-atendimento.repository';
import { BuscarUsuarioAtendimentoRepository } from './repositories/buscar-usuario-atendimento.repository';
import { CriarUsuarioAtendimentoRepository } from './repositories/criar-usuario-atendimento.repository';
import { AtualizarUsuarioAtendimentoRepository } from './repositories/atualizar-usuario-atendimento.repository';
import { ExcluirUsuarioAtendimentoRepository } from './repositories/excluir-usuario-atendimento.repository';

@Module({
  controllers: [
    ListarUsuariosAtendimentoController,
    CriarUsuarioAtendimentoController,
    BuscarUsuarioAtendimentoController,
    AtualizarUsuarioAtendimentoController,
    ExcluirUsuarioAtendimentoController,
  ],
  providers: [
    ListarUsuariosAtendimentoService,
    BuscarUsuarioAtendimentoService,
    CriarUsuarioAtendimentoService,
    AtualizarUsuarioAtendimentoService,
    ExcluirUsuarioAtendimentoService,
    ListarUsuariosAtendimentoRepository,
    BuscarUsuarioAtendimentoRepository,
    CriarUsuarioAtendimentoRepository,
    AtualizarUsuarioAtendimentoRepository,
    ExcluirUsuarioAtendimentoRepository,
  ],
})

/**
 * EXPORTS
 */
export class UsuariosAtendimentosModule {}
