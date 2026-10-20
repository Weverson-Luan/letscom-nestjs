import { Module } from '@nestjs/common';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';
import { ConversaParticipanteController } from './controllers/conversa-participante.controller';
import { ConviteConversaController } from './controllers/convite-conversa.controller';
import { MinhaConversaMensagemController } from './controllers/minha-conversa-mensagem.controller';
import { MinhaConversaParticipanteController } from './controllers/minha-conversa-participante.controller';
import { ConversaParticipanteRepository } from './repositories/conversa-participante.repository';
import { AceitarConviteConversaService } from './services/aceitar-convite-conversa.service';
import { ConversaAcessoService } from './services/conversa-acesso.service';
import { ConvidarParticipanteConversaService } from './services/convidar-participante-conversa.service';
import { ListarCandidatosConviteConversaService } from './services/listar-candidatos-convite-conversa.service';
import { ListarParticipantesConversaService } from './services/listar-participantes-conversa.service';
import { RecusarConviteConversaService } from './services/recusar-convite-conversa.service';
import { RemoverParticipanteConversaService } from './services/remover-participante-conversa.service';
import { InativarParticipanteConversaService } from './services/inativar-participante-conversa.service';
import { ReativarParticipanteConversaService } from './services/reativar-participante-conversa.service';
import { MensagemRegistroService } from './services/mensagem-registro.service';
import { BaixarAnexoMinhaConversaService } from './services/baixar-anexo-minha-conversa.service';
import { ListarMinhasMensagensConversaService } from './services/listar-minhas-mensagens-conversa.service';
import { ResponderConversaClienteService } from './services/responder-conversa-cliente.service';
import { ConversaMensagemController } from './controllers/conversa-mensagem.controller';
import { ConversaClienteResumoController } from './controllers/conversa-cliente-resumo.controller';
import { ConversaMensagemRepository } from './repositories/conversa-mensagem.repository';
import { ConversaClienteResumoRepository } from './repositories/conversa-cliente-resumo.repository';
import { AtualizarMensagemConversaService } from './services/atualizar-mensagem-conversa.service';
import { BaixarAnexoMensagemConversaService } from './services/baixar-anexo-mensagem-conversa.service';
import { BuscarConversaClienteService } from './services/buscar-conversa-cliente.service';
import { CriarMensagemConversaService } from './services/criar-mensagem-conversa.service';
import { ListarMensagensConversaService } from './services/listar-mensagens-conversa.service';
import { ListarConversasClientesService } from './services/listar-conversas-clientes.service';
import { RemoverMensagemConversaService } from './services/remover-mensagem-conversa.service';

@Module({
  imports: [NotificacoesModule],
  controllers: [
    ConversaClienteResumoController,
    ConversaMensagemController,
    MinhaConversaMensagemController,
    ConversaParticipanteController,
    MinhaConversaParticipanteController,
    ConviteConversaController,
  ],
  providers: [
    ListarConversasClientesService,
    BuscarConversaClienteService,
    ListarMensagensConversaService,
    CriarMensagemConversaService,
    AtualizarMensagemConversaService,
    RemoverMensagemConversaService,
    BaixarAnexoMensagemConversaService,
    ListarMinhasMensagensConversaService,
    ResponderConversaClienteService,
    BaixarAnexoMinhaConversaService,
    MensagemRegistroService,
    ConversaAcessoService,
    ListarParticipantesConversaService,
    ListarCandidatosConviteConversaService,
    ConvidarParticipanteConversaService,
    RemoverParticipanteConversaService,
    InativarParticipanteConversaService,
    ReativarParticipanteConversaService,
    AceitarConviteConversaService,
    RecusarConviteConversaService,
    ConversaParticipanteRepository,
    ConversaMensagemRepository,
    ConversaClienteResumoRepository,
  ],
})
export class ConversasClientesModule {}
