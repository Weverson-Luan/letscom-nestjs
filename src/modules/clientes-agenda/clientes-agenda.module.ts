import { Module } from '@nestjs/common';
import { AgendaClienteController } from './controllers/agenda-cliente.controller';
import { MinhaAgendaController } from './controllers/minha-agenda.controller';
import { ClienteCompromissoRepository } from './repositories/cliente-compromisso.repository';
import { ResponsavelCompromissoRepository } from './repositories/responsavel-compromisso.repository';
import { AtualizarCompromissoClienteService } from './services/atualizar-compromisso-cliente.service';
import { CriarCompromissoClienteService } from './services/criar-compromisso-cliente.service';
import { ListarCompromissosClienteService } from './services/listar-compromissos-cliente.service';
import { ListarMinhaAgendaService } from './services/listar-minha-agenda.service';
import { ListarResponsaveisCompromissoService } from './services/listar-responsaveis-compromisso.service';
import { RemoverCompromissoClienteService } from './services/remover-compromisso-cliente.service';
import { ValidacaoResponsavelCompromissoService } from './services/validacao-responsavel-compromisso.service';

@Module({
  controllers: [AgendaClienteController, MinhaAgendaController],
  providers: [
    ListarCompromissosClienteService,
    CriarCompromissoClienteService,
    AtualizarCompromissoClienteService,
    RemoverCompromissoClienteService,
    ListarResponsaveisCompromissoService,
    ListarMinhaAgendaService,
    ValidacaoResponsavelCompromissoService,
    ClienteCompromissoRepository,
    ResponsavelCompromissoRepository,
  ],
})
export class ClientesAgendaModule {}
