import { Injectable } from '@nestjs/common';
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
  ) {}

  async liberarEmLote(dto: LiberarRemessasLoteDto, user: AuthUser) {
    const remessaIds = [...new Set(dto.remessa_ids.map((id) => BigInt(id)))];
    const continuarApenasValidas = Boolean(dto.continuar_apenas_validas);

    const validacao = await this.validarRemessas(remessaIds);

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

    await this.dispararEmailsPorRemessa(
      validacao.remessasValidas,
      {
        id: liberador.id,
        nome: liberador.nome,
        roles: user.roles.map((nome) => ({ nome })),
      },
      validacao.tiposPorRemessa,
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

  private async validarRemessas(remessaIds: bigint[]) {
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
    const tiposPorCliente = new Map(
      tipos.map((t) => [t.clienteId.toString(), t.tipoEntregaId]),
    );

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

      const tipoEntregaId = tiposPorCliente.get(remessa.clienteId.toString());
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

  private async dispararEmailsPorRemessa(
    remessas: RemessaComCliente[],
    liberador: { id: bigint; nome: string; roles: { nome: string }[] },
    tiposPorRemessa: Map<string, bigint>,
  ) {
    const clienteIds = [
      ...new Set(remessas.map((r) => r.clienteId.toString())),
    ].map((id) => BigInt(id));
    const enderecosPorCliente =
      await this.mensagemHelper.carregarEnderecosResidenciaisPorClientes(clienteIds);

    for (const remessa of remessas) {
      const tipoEntregaId = tiposPorRemessa.get(remessa.id.toString());
      if (!tipoEntregaId) continue;

      const endereco = enderecosPorCliente.get(remessa.clienteId.toString()) ?? null;
      const nomeCliente = remessa.cliente?.nome ?? 'Cliente';
      const observacao = await this.mensagemHelper.gerarMensagem(
        tipoEntregaId,
        nomeCliente,
        remessa.numeroRemessa,
        endereco,
      );

      await this.emailService.enviarSemExcecao(
        remessa,
        liberador,
        tipoEntregaId,
        observacao,
      );
    }
  }
}
