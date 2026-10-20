import { Module } from '@nestjs/common';
import { NotificacaoController } from './controllers/notificacao.controller';
import { NotificacaoRepository } from './repositories/notificacao.repository';
import { ContarNotificacoesNaoLidasService } from './services/contar-notificacoes-nao-lidas.service';
import { ListarNotificacoesService } from './services/listar-notificacoes.service';
import { MarcarNotificacaoLidaService } from './services/marcar-notificacao-lida.service';
import { MarcarNotificacoesConviteLidasService } from './services/marcar-notificacoes-convite-lidas.service';
import { MarcarTodasNotificacoesLidasService } from './services/marcar-todas-notificacoes-lidas.service';
import { NotificacaoEmissorService } from './services/notificacao-emissor.service';

@Module({
  controllers: [NotificacaoController],
  providers: [
    ListarNotificacoesService,
    ContarNotificacoesNaoLidasService,
    MarcarNotificacaoLidaService,
    MarcarTodasNotificacoesLidasService,
    NotificacaoEmissorService,
    MarcarNotificacoesConviteLidasService,
    NotificacaoRepository,
  ],
  exports: [NotificacaoEmissorService, MarcarNotificacoesConviteLidasService],
})
export class NotificacoesModule {}
