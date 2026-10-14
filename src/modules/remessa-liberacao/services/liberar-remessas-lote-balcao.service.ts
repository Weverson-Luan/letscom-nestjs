import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { setTimeout as sleep } from 'timers/promises';
import { Remessa, RemessaSituacao, User, UserCliente } from '@prisma/client';
import { AuthUser } from 'src/shared/decorators/current-user.decorator';
import { BusinessException } from 'src/shared/exceptions/business.exception';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { LiberarRemessasLoteDto } from '../dto/liberar-remessas-lote.dto';
import { LoteValidacaoException } from '../exceptions/lote-validacao.exception';
import { LiberacaoRemessaMensagemHelper } from '../helpers/liberacao-remessa-mensagem.helper';
import { RemessaLiberadaBalcaoRepository } from '../repositories/remessa-liberada-balcao.repository';
import { LiberacaoRemessaBalcaoEmailService } from './liberacao-remessa-balcao-email.service';

type RemessaComCliente = Remessa & {
  cliente?: User | null;
  solicitante?: User | null;
  solicitanteSubordinado?: UserCliente | null;
};

type LoteItem = {
  id: bigint | number;
  numero_remessa: string | number | bigint;
  motivo?: string;
};

@Injectable()
export class LiberarRemessasLoteBalcaoService {
  private static readonly STATUS_APTO = 'conferido';
  private static readonly SITUACOES_INVALIDAS = ['cancelada', 'cancelado'];

  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: RemessaLiberadaBalcaoRepository,
    private readonly emailService: LiberacaoRemessaBalcaoEmailService,
    private readonly mensagemHelper: LiberacaoRemessaMensagemHelper,
    private readonly config: ConfigService,
  ) {}

  async liberarEmLote(dto: LiberarRemessasLoteDto, user: AuthUser) {
    const remessaIds = [...new Set(dto.remessa_ids.map((id) => BigInt(id)))];
    const continuarApenasValidas = Boolean(dto.continuar_apenas_validas);
    // tipo_entrega_id informado sobrepõe o tipo cadastrado de cada cliente
    const tipoEntregaOverride = dto.tipo_entrega_id ? BigInt(dto.tipo_entrega_id) : null;

    const validacao = await this.validarRemessas(remessaIds, tipoEntregaOverride);

    if (validacao.invalidas.length > 0 && !continuarApenasValidas) {
      throw new LoteValidacaoException(validacao.invalidas, validacao.validas);
    }

    if (validacao.remessasValidas.length === 0) {
      throw new BusinessException('Nenhuma remessa válida para liberação.');
    }

    const liberador = await this.prisma.user.findUnique({ where: { id: user.id } });
    if (!liberador) {
      throw new BusinessException('Usuário liberador não encontrado.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.remessaLiberadaBalcao.createMany({
        data: validacao.remessasValidas.map((remessa) => ({
          remessaId: remessa.id,
          userIdExecutor: liberador.id,
          tipoEntregaId: validacao.tiposPorRemessa.get(remessa.id.toString())!,
          observacao: dto.observacao ?? null,
          outros: dto.outros ?? null,
        })),
      });

      await tx.remessa.updateMany({
        where: { id: { in: validacao.remessasValidas.map((r) => r.id) } },
        data: {
          status: 'pedido_liberado',
          situacao: RemessaSituacao.pedido_liberado,
        },
      });
    });

    await this.dispararEmailsPorCliente(
      validacao.remessasValidas,
      {
        id: liberador.id,
        nome: liberador.nome,
        roles: user.roles.map((nome) => ({ nome })),
      },
      validacao.tiposPorRemessa,
      dto.observacao ?? null,
    );

    return {
      liberadas: validacao.remessasValidas.map((r) => ({
        id: r.id,
        numero_remessa: r.numeroRemessa,
      })),
      invalidas: validacao.invalidas,
      total_liberadas: validacao.remessasValidas.length,
      total_invalidas: validacao.invalidas.length,
      grupos: validacao.grupos,
    };
  }

  private async validarRemessas(remessaIds: bigint[], tipoEntregaOverride: bigint | null = null) {
    const remessas = await this.prisma.remessa.findMany({
      where: { id: { in: remessaIds }, deletedAt: null },
      include: {
        cliente: true,
        solicitante: true,
        solicitanteSubordinado: true,
      },
    });
    const byId = new Map(remessas.map((r) => [r.id.toString(), r as RemessaComCliente]));

    const jaLiberadas = await this.repository.findRemessaIdsLiberadas(remessaIds);
    const jaLiberadasSet = new Set(jaLiberadas.map((r) => r.remessaId.toString()));

    const clienteIds = [
      ...new Set(remessas.map((r) => r.clienteId.toString()).filter(Boolean)),
    ].map((id) => BigInt(id));

    const tipos = await this.prisma.tipoEntregaUser.findMany({
      where: { clienteId: { in: clienteIds } },
    });
    const tiposPorCliente = new Map(tipos.map((t) => [t.clienteId.toString(), t.tipoEntregaId]));

    const validas: LoteItem[] = [];
    const invalidas: LoteItem[] = [];
    const remessasValidas: RemessaComCliente[] = [];
    const tiposPorRemessa = new Map<string, bigint>();

    for (const id of remessaIds) {
      const remessa = byId.get(id.toString());

      if (!remessa) {
        invalidas.push({
          id,
          numero_remessa: String(id),
          motivo: 'Remessa não encontrada',
        });
        continue;
      }

      if (jaLiberadasSet.has(remessa.id.toString())) {
        invalidas.push({
          id: remessa.id,
          numero_remessa: remessa.numeroRemessa,
          motivo: 'Remessa já liberada',
        });
        continue;
      }

      const situacao = (remessa.situacao ?? '').toString().toLowerCase();
      const status = (remessa.status ?? '').toLowerCase();
      if (
        LiberarRemessasLoteBalcaoService.SITUACOES_INVALIDAS.includes(situacao) ||
        LiberarRemessasLoteBalcaoService.SITUACOES_INVALIDAS.includes(status)
      ) {
        invalidas.push({
          id: remessa.id,
          numero_remessa: remessa.numeroRemessa,
          motivo: 'Remessa cancelada',
        });
        continue;
      }

      if (remessa.status !== LiberarRemessasLoteBalcaoService.STATUS_APTO) {
        invalidas.push({
          id: remessa.id,
          numero_remessa: remessa.numeroRemessa,
          motivo: 'Remessa não está apta para liberação',
        });
        continue;
      }

      const tipoEntregaId =
        tipoEntregaOverride ?? tiposPorCliente.get(remessa.clienteId.toString());
      if (!tipoEntregaId) {
        invalidas.push({
          id: remessa.id,
          numero_remessa: remessa.numeroRemessa,
          motivo: 'Cliente sem tipo de entrega cadastrado',
        });
        continue;
      }

      tiposPorRemessa.set(remessa.id.toString(), tipoEntregaId);
      validas.push({ id: remessa.id, numero_remessa: remessa.numeroRemessa });
      remessasValidas.push(remessa);
    }

    return {
      validas,
      invalidas,
      remessasValidas,
      tiposPorRemessa,
      grupos: this.montarGruposPorCliente(remessasValidas, tiposPorRemessa),
    };
  }

  private montarGruposPorCliente(
    remessas: RemessaComCliente[],
    tiposPorRemessa: Map<string, bigint>,
  ) {
    const grupos = new Map<
      string,
      {
        cliente_id: bigint;
        cliente: string;
        quantidade: number;
        tipo_entrega_id: bigint | null;
      }
    >();

    for (const remessa of remessas) {
      const key = remessa.clienteId.toString();
      if (!grupos.has(key)) {
        grupos.set(key, {
          cliente_id: remessa.clienteId,
          cliente: remessa.cliente?.nome ?? 'Cliente',
          quantidade: 0,
          tipo_entrega_id: tiposPorRemessa.get(remessa.id.toString()) ?? null,
        });
      }
      grupos.get(key)!.quantidade++;
    }

    return [...grupos.values()];
  }

  /**
   * Um e-mail por cliente com todas as remessas liberadas dele. A observação
   * digitada pelo usuário só substitui a mensagem padrão quando o lote é de um
   * único cliente.
   */
  private async dispararEmailsPorCliente(
    remessas: RemessaComCliente[],
    liberador: { id: bigint; nome: string; roles: { nome: string }[] },
    tiposPorRemessa: Map<string, bigint>,
    observacaoUsuario: string | null,
  ) {
    const porCliente = new Map<string, RemessaComCliente[]>();
    for (const remessa of remessas) {
      const key = remessa.clienteId.toString();
      porCliente.set(key, [...(porCliente.get(key) ?? []), remessa]);
    }

    const clienteIds = [...porCliente.keys()].map((id) => BigInt(id));
    const enderecosPorCliente =
      await this.mensagemHelper.carregarEnderecosResidenciaisPorClientes(clienteIds);
    const mesmoClienteUnico = clienteIds.length === 1;
    const observacaoUsuarioPreenchida = (observacaoUsuario ?? '').trim() !== '';
    const delayMs = this.config.get<number>('mail.sendDelayMs') ?? 500;

    for (const [clienteId, remessasDoCliente] of porCliente) {
      const primeira = remessasDoCliente[0];
      const tipoEntregaId = tiposPorRemessa.get(primeira.id.toString());
      if (!tipoEntregaId) continue;

      const numeros = remessasDoCliente
        .map((r) => r.numeroRemessa)
        .filter((n) => n !== null && n !== undefined && String(n) !== '')
        .join(', ');
      const nomeCliente = primeira.cliente?.nome ?? 'Cliente';
      const endereco = enderecosPorCliente.get(clienteId) ?? null;

      const observacao =
        mesmoClienteUnico && observacaoUsuarioPreenchida
          ? observacaoUsuario!
          : await this.mensagemHelper.gerarMensagem(tipoEntregaId, nomeCliente, numeros, endereco);

      const assunto =
        remessasDoCliente.length > 1
          ? `Atualização das suas remessas Nº ${numeros}`
          : `Atualização da sua remessa Nº ${numeros}`;

      await this.emailService.enviarSemExcecao(
        primeira,
        liberador,
        tipoEntregaId,
        observacao,
        null,
        assunto,
      );

      // Delay entre envios para evitar rate limiting do MailerSend
      await sleep(delayMs);
    }
  }
}
