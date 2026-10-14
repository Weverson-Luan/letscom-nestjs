import { Module } from '@nestjs/common';
import { CreditSaleController } from './controllers/credit-sale.controller';
import { CreditSaleRepository } from './repositories/credit-sale.repository';
import { ExtratoMovimentacaoRepository } from './repositories/extrato-movimentacao.repository';
import { CreditSaleService } from './services/credit-sale.service';
import { CreditoClienteExtratoService } from './services/credito-cliente-extrato.service';
import { ListarMinhaCobrancaCreditoService } from './services/listar-minha-cobranca-credito.service';

@Module({
  controllers: [CreditSaleController],
  providers: [
    CreditSaleService,
    CreditoClienteExtratoService,
    ListarMinhaCobrancaCreditoService,
    CreditSaleRepository,
    ExtratoMovimentacaoRepository,
  ],
  exports: [CreditSaleService, CreditoClienteExtratoService],
})
export class CreditSalesModule {}
