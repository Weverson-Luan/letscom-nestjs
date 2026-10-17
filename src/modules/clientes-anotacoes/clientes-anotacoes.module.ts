import { Module } from '@nestjs/common';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';
import { ConversaParticipanteController } from './controllers/conversa-participante.controller';
import { ConviteConversaController } from './controllers/convite-conversa.controller';
import { MinhaAnotacaoController } from './controllers/minha-anotacao.controller';
import { MinhaConversaParticipanteController } from './controllers/minha-conversa-participante.controller';
import { ConversaParticipanteRepository } from './repositories/conversa-participante.repository';
import { AceitarConviteConversaService } from './services/aceitar-convite-conversa.service';
import { ConversaAcessoService } from './services/conversa-acesso.service';
import { ConvidarParticipanteConversaService } from './services/convidar-participante-conversa.service';
import { ListarCandidatosConviteConversaService } from './services/listar-candidatos-convite-conversa.service';
import { ListarParticipantesConversaService } from './services/listar-participantes-conversa.service';
import { RecusarConviteConversaService } from './services/recusar-convite-conversa.service';
import { RemoverParticipanteConversaService } from './services/remover-participante-conversa.service';
import { AnotacaoRegistroService } from './services/anotacao-registro.service';
import { BaixarAnexoMinhaAnotacaoService } from './services/baixar-anexo-minha-anotacao.service';
import { ListarMinhasAnotacoesService } from './services/listar-minhas-anotacoes.service';
import { ResponderAnotacoesClienteService } from './services/responder-anotacoes-cliente.service';
import { ClienteAnotacaoController } from './controllers/cliente-anotacao.controller';
import { ClienteResumoAnotacoesController } from './controllers/cliente-resumo-anotacoes.controller';
import { ClienteAnotacaoRepository } from './repositories/cliente-anotacao.repository';
import { ClienteResumoAnotacoesRepository } from './repositories/cliente-resumo-anotacoes.repository';
import { AtualizarAnotacaoClienteService } from './services/atualizar-anotacao-cliente.service';
import { BaixarAnexoAnotacaoClienteService } from './services/baixar-anexo-anotacao-cliente.service';
import { BuscarClienteAnotacoesService } from './services/buscar-cliente-anotacoes.service';
import { CriarAnotacaoClienteService } from './services/criar-anotacao-cliente.service';
import { ListarAnotacoesClienteService } from './services/listar-anotacoes-cliente.service';
import { ListarClientesAnotacoesService } from './services/listar-clientes-anotacoes.service';
import { RemoverAnotacaoClienteService } from './services/remover-anotacao-cliente.service';

@Module({
  imports: [NotificacoesModule],
  controllers: [
    ClienteResumoAnotacoesController,
    ClienteAnotacaoController,
    MinhaAnotacaoController,
    ConversaParticipanteController,
    MinhaConversaParticipanteController,
    ConviteConversaController,
  ],
  providers: [
    ListarClientesAnotacoesService,
    BuscarClienteAnotacoesService,
    ListarAnotacoesClienteService,
    CriarAnotacaoClienteService,
    AtualizarAnotacaoClienteService,
    RemoverAnotacaoClienteService,
    BaixarAnexoAnotacaoClienteService,
    ListarMinhasAnotacoesService,
    ResponderAnotacoesClienteService,
    BaixarAnexoMinhaAnotacaoService,
    AnotacaoRegistroService,
    ConversaAcessoService,
    ListarParticipantesConversaService,
    ListarCandidatosConviteConversaService,
    ConvidarParticipanteConversaService,
    RemoverParticipanteConversaService,
    AceitarConviteConversaService,
    RecusarConviteConversaService,
    ConversaParticipanteRepository,
    ClienteAnotacaoRepository,
    ClienteResumoAnotacoesRepository,
  ],
})
export class ClientesAnotacoesModule {}
