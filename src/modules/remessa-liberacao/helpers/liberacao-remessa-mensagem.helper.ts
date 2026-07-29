import { Injectable } from '@nestjs/common';
import { Endereco, TipoEndereco } from '@prisma/client';
import { PrismaService } from 'src/shared/prisma/prisma.service';

/**
 * Espelha LiberacaoRemessaMensagemHelper do Laravel.
 */
@Injectable()
export class LiberacaoRemessaMensagemHelper {
  constructor(private readonly prisma: PrismaService) {}

  async carregarEnderecosResidenciaisPorClientes(
    clienteIds: bigint[],
  ): Promise<Map<string, Endereco | null>> {
    const map = new Map<string, Endereco | null>();
    if (clienteIds.length === 0) return map;

    const enderecos = await this.prisma.endereco.findMany({
      where: {
        userId: { in: clienteIds },
        tipoEndereco: TipoEndereco.residencial,
      },
    });

    const byUser = new Map(enderecos.map((e) => [e.userId.toString(), e]));
    for (const id of clienteIds) {
      map.set(id.toString(), byUser.get(id.toString()) ?? null);
    }
    return map;
  }

  formatarEndereco(endereco: Endereco | null | undefined): string {
    if (!endereco) return '';
    return `${endereco.logradouro ?? ''}, Nº${endereco.numero ?? ''}, Bairro ${endereco.bairro ?? ''}, CEP ${endereco.cep ?? ''}.`;
  }

  async gerarMensagem(
    tipoEntregaId: bigint,
    nomeCliente: string,
    numeroRemessa: string | number | bigint,
    endereco?: Endereco | null,
  ): Promise<string> {
    const tipoEntrega = await this.prisma.tipoEntrega.findUnique({
      where: { id: tipoEntregaId },
    });
    const tipo = (tipoEntrega?.tipo ?? 'balcao').toLowerCase();
    const enderecoFormatado = this.formatarEndereco(endereco);
    const responsavel = endereco?.nomeResponsavel ?? '';
    const setor = endereco?.setor ?? '';
    const remessa = String(numeroRemessa);

    switch (tipo) {
      case 'correios':
        return this.mensagemCorreios(
          nomeCliente,
          remessa,
          enderecoFormatado,
          responsavel,
          setor,
        );
      case 'motoboy_letscom':
        return this.mensagemMotoboy(
          nomeCliente,
          remessa,
          enderecoFormatado,
          responsavel,
          setor,
        );
      case 'outros':
      case 'transportadora':
        return this.mensagemOutros(nomeCliente, remessa);
      default:
        return this.mensagemBalcao(nomeCliente, remessa);
    }
  }

  private mensagemBalcao(nome: string, remessa: string): string {
    return (
      `Olá ${nome}, tudo bem?\n` +
      `Sua Remessa Nº ${remessa} já está disponível para retirada no Balcão da Letscom.\n` +
      `Segue abaixo o endereço e horário de retirada:\n\n` +
      `Letscom\n` +
      `Rua Iguaçu, 674 – Casa 1\n` +
      `Bairro Concórdia\n\n` +
      `Horário de Retirada: \n` +
      `Segunda a Sexta de 08h30 às 12h e 13h30 às 17h.\n\n` +
      `OBS: \n` +
      `1. Não realizamos entrega de pedido na calçada.\n` +
      `2. O colaborador / motoboy deverá tocar o interfone (Casa 1) e informar a retirada do pedido da “EMPRESA SOLICITANTE”.\n` +
      '3. Não acompanhamos a rota via app de entrega (Ex: Uber entrega).'
    );
  }

  private mensagemCorreios(
    nome: string,
    remessa: string,
    endereco: string,
    responsavel: string,
    setor: string,
  ): string {
    return (
      `Olá ${nome}, tudo bem?\n` +
      `Sua Remessa Nº ${remessa} será enviada via Correios. Em breve você receberá o rastreio e o pedido no enderço:\n` +
      `${endereco}\n\n` +
      `Setor: ${setor} \n` +
      `Responsável: ${responsavel}\n\n` +
      'Qualquer dúvida, entre em contato.'
    );
  }

  private mensagemMotoboy(
    nome: string,
    remessa: string,
    endereco: string,
    responsavel: string,
    setor: string,
  ): string {
    return (
      `Olá ${nome}, tudo bem?\n` +
      `Sua Remessa Nº ${remessa} será entregue via Motoboy Letscom, em horário comercial, no endereço:\n` +
      `${endereco}\n\n` +
      `Setor: ${setor} \n` +
      `Responsável: ${responsavel}\n\n` +
      `Por favor, certifique-se de que alguém estará disponível para receber.\n` +
      'Obs: As entregas são realizadas às quartas e sexta-feiras.'
    );
  }

  private mensagemOutros(nome: string, remessa: string): string {
    return (
      `Olá ${nome}, tudo bem?\n` +
      `Sua Remessa Nº ${remessa} foi despachada e será entregue conforme combinado.`
    );
  }
}
