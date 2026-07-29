import { Module } from '@nestjs/common';
import { LiberarRemessaController } from './controllers/liberar-remessa.controller';
import { RemessaLiberadaClienteController } from './controllers/remessa-liberada-cliente.controller';
import { LiberacaoRemessaMensagemHelper } from './helpers/liberacao-remessa-mensagem.helper';
import { RemessaLiberadaBalcaoRepository } from './repositories/remessa-liberada-balcao.repository';
import { RemessaLiberadaClienteRepository } from './repositories/remessa-liberada-cliente.repository';
import { LiberacaoRemessaBalcaoEmailService } from './services/liberacao-remessa-balcao-email.service';
import { LiberarRemessasLoteBalcaoService } from './services/liberar-remessas-lote-balcao.service';
import { LiberarRemessasLoteClienteService } from './services/liberar-remessas-lote-cliente.service';
import { RemessaLiberadaBalcaoService } from './services/remessa-liberada-balcao.service';
import { RemessaLiberadaClienteService } from './services/remessa-liberada-cliente.service';

/**
 * Liberação de remessa — balcão (expedição) e cliente (recepção).
 * Espelha RemessaLiberadaBalcaoController + RemessaLiberadaClienteController.
 */
@Module({
  controllers: [LiberarRemessaController, RemessaLiberadaClienteController],
  providers: [
    RemessaLiberadaBalcaoRepository,
    RemessaLiberadaClienteRepository,
    RemessaLiberadaBalcaoService,
    RemessaLiberadaClienteService,
    LiberarRemessasLoteBalcaoService,
    LiberarRemessasLoteClienteService,
    LiberacaoRemessaBalcaoEmailService,
    LiberacaoRemessaMensagemHelper,
  ],
  exports: [RemessaLiberadaBalcaoService, RemessaLiberadaClienteService],
})
export class RemessaLiberacaoModule {}
