import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, RemessaPosicao, RemessaSituacao, RemessaStatusEtapa } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { AuthUser } from 'src/shared/decorators/current-user.decorator';
import { BusinessException } from 'src/shared/exceptions/business.exception';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { StorageService } from 'src/shared/storage/storage.service';
import { ImageService } from 'src/shared/utils/image.service';
import { SpreadsheetService } from 'src/shared/utils/spreadsheet.service';
import { ZipService } from 'src/shared/utils/zip.service';
import { RemessaRepository, AuthContext } from '../repositories/remessa.repository';

export interface UploadFile {
  buffer: Buffer;
  originalname: string;
}

export interface SolicitarRemessaInput {
  data: Record<string, any>;
  csvFile?: UploadFile;
  zipFile?: UploadFile;
  /** caminhos gravados no storage (para cleanup em caso de rollback) */
  storedFiles: string[];
}

@Injectable()
export class RemessaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: RemessaRepository,
    private readonly storage: StorageService,
    private readonly image: ImageService,
    private readonly spreadsheet: SpreadsheetService,
    private readonly zip: ZipService,
    private readonly config: ConfigService,
  ) {}

  private authContext(user: AuthUser): AuthContext {
    return { userId: user.id, role: (user.roles?.[0] ?? '').toLowerCase() };
  }

  // ----------------------------------------------------------- LISTAGENS
  list(query: Record<string, unknown>, user: AuthUser) {
    return this.repository.paginate(query, this.authContext(user));
  }
  listarDisponiveisParaProducao(query: Record<string, unknown>) {
    return this.repository.getDisponiveisParaProducao(query);
  }
  listarMinhasTarefas(query: Record<string, unknown>, user: AuthUser) {
    return this.repository.getMinhasTarefas(query, this.authContext(user));
  }
  listarTarefasEmExpedicao(query: Record<string, unknown>, user: AuthUser) {
    return this.repository.getEmExpedicoes(query, this.authContext(user));
  }
  listarTarefasBalcao(query: Record<string, unknown>, user: AuthUser) {
    return this.repository.getBalcao(query, this.authContext(user));
  }
  listarRemessasEmAndamentoPorCliente(clienteId: bigint, query: Record<string, unknown>) {
    return this.repository.getEmAndamentoPorCliente(clienteId, query);
  }
  listarRemessasFinalizadasPorCliente(clienteId: bigint, query: Record<string, unknown>) {
    return this.repository.getFinalizadasPorCliente(clienteId, query);
  }
  findById(id: bigint) {
    return this.repository.findById(id);
  }

  // ----------------------------------------------------------- SOLICITAÇÃO
  /**
   * Cria a remessa dentro de uma transação (tx). Espelha
   * RemessaService::solicitarRemessa: valida crédito/arquivos, cria a remessa,
   * persiste planilha + fotos e consome créditos.
   */
  async solicitarRemessa(tx: Prisma.TransactionClient, input: SolicitarRemessaInput) {
    const { data, csvFile, zipFile, storedFiles } = input;

    let campoChave: string | null = data.campo_chave ?? null;


    if ([null, '', 'undefined', 'null'].includes(campoChave as any)) campoChave = null;

    if (!data.produto_id) {
      throw new BusinessException(
        'Produto de crédito é obrigatório para solicitar esta remessa.',
      );
    }

    const clienteId = BigInt(data.cliente_id);
    const user = await tx.user.findUnique({ where: { id: clienteId } });

    if (!user) throw new BusinessException('Cliente não encontrado.');


    const qtdSolicitacao = parseInt(String(data.total_solicitacoes), 10);
    const produtoId = BigInt(data.produto_id);

    const produto = await tx.product.findFirst({ where: { id: produtoId, ativo: true } });
    if (!produto) {
      throw new BusinessException('Produto de crédito inválido ou inexistente!');
    }

    const saldo = await this.saldoCreditos(tx, clienteId, produtoId);
    if (saldo < qtdSolicitacao) {
      throw new BusinessException(
        `Saldo insuficiente. Disponível: ${saldo}, necessário: ${qtdSolicitacao}!`,
      );
    }

    const entrada = await tx.creditSale.findFirst({
      where: {
        clienteId,
        produtoId,
        status: 'confirmado',
        tipoTransacao: 'entrada',
      },
      orderBy: { dataVenda: 'asc' },
    });
    if (!entrada) {
      throw new BusinessException('Produto de crédito inválido ou não adquirido pelo cliente!');
    }

    const modelo = await tx.modeloTecnico.findUnique({
      where: { id: BigInt(data.modelo_tecnico_id) },
      include: { camposVariaveis: true },
    });
    if (!modelo) throw new BusinessException('Modelo técnico não encontrado.');

    const temCargaFoto = modelo.temCargaFoto;
    if (temCargaFoto) {
      if (!csvFile || !zipFile || !campoChave) {
        throw new BusinessException(
          'Este modelo exige planilha, arquivo ZIP e campo chave para carga de fotos.',
        );
      }
    } else if (csvFile && !campoChave) {
      throw new BusinessException(
        'Para processar a planilha é obrigatório informar o campo chave.',
      );
    }

    // pré-processamento em memória
    let dadosCsv: Record<string, { matricula: string; nome: string }> = {};
    let qtdZip: number | null = null;

    if (csvFile) {
      dadosCsv = await this.extrairRegistrosPlanilha(csvFile, modelo, String(campoChave).toLowerCase());
    }
    if (temCargaFoto && zipFile) {
      qtdZip = await this.preScanZip(zipFile, dadosCsv);
    }

    if (Object.keys(dadosCsv).length > 0 || qtdZip !== null) {
      this.validarConsistencia(qtdSolicitacao, Object.keys(dadosCsv).length, qtdZip);
    }

    // criação da remessa
    const remessa = await tx.remessa.create({
      data: {
        clienteId,
        userIdSolicitanteRemessa: data.user_id_solicitante_remessa
          ? BigInt(data.user_id_solicitante_remessa)
          : null,
        usersSolicitanteSubordinadoId: data.users_solicitante_subordinado_id
          ? BigInt(data.users_solicitante_subordinado_id)
          : null,
        userIdExecutor: data.user_id_executor ? BigInt(data.user_id_executor) : null,
        consultorId: data.consultor_id ? BigInt(data.consultor_id) : null,
        modeloTecnicoId: BigInt(data.modelo_tecnico_id),
        tecnologiaId: BigInt(data.tecnologia_id),
        totalSolicitacoes: qtdSolicitacao,
        situacao: data.situacao as RemessaSituacao,
        status: data.status,
        posicao: this.normalizarPosicao(data.posicao),
        observacao: data.observacao ?? null,
        numeroRemessa: await this.gerarNumeroRemessa(tx),
      },
    });

    if (csvFile) {
      await this.persistirPlanilha(tx, remessa.id, csvFile, clienteId, storedFiles);
    }
    if (temCargaFoto && zipFile) {
      await this.persistirFotos(tx, remessa.id, zipFile, dadosCsv, clienteId, storedFiles);
    }

    await this.consumirCreditos(
      tx,
      clienteId,
      produtoId,
      qtdSolicitacao,
      remessa,
      data.user_id_solicitante_remessa ?? null,
    );

    return remessa;
  }

  // ----------------------------------------------------------- UPDATE / DELETE
  async updateRemessa(id: bigint, data: Record<string, any>): Promise<boolean> {
    const remessa = await this.prisma.remessa.findUnique({
      where: { id },
      include: { planilhas: true, fotos: true, modeloTecnico: true },
    });
    if (!remessa) throw new BusinessException('Remessa não encontrada.', 404 as any);

    const otherKeys = Object.keys(data).filter((k) => k !== 'observacao');
    const isSomenteObservacao = 'observacao' in data && otherKeys.length === 0;

    if (remessa.situacao === ('confirmado' as any) && !isSomenteObservacao) {
      throw new Error('Não é possível alterar uma remessa já confirmada!');
    }
    let payload = data;
    if (remessa.situacao === ('confirmado' as any) && isSomenteObservacao) {
      payload = { observacao: data.observacao };
    }

    await this.prisma.$transaction(async (tx) => {
      // cancelamento: apaga arquivos e devolve créditos
      if (data.situacao === 'cancelada' && data.status === 'cancelada') {
        for (const planilha of remessa.planilhas) {
          if (await this.storage.exists(planilha.filePath)) await this.storage.delete(planilha.filePath);
          await tx.remessaPlanilha.delete({ where: { id: planilha.id } });
        }
        for (const foto of remessa.fotos) {
          if (await this.storage.exists(foto.filePath)) await this.storage.delete(foto.filePath);
          await tx.remessaFoto.delete({ where: { id: foto.id } });
        }

        const modelo = remessa.modeloTecnico;
        if (!modelo || !modelo.produtoId) {
          throw new BusinessException(
            'Não foi possível identificar o produto vinculado ao modelo técnico da remessa.',
          );
        }

        const responsavel = BigInt(
          this.config.get<string>('business.userIdExecutorAdmin') || remessa.clienteId.toString(),
        );
        const qtd = remessa.totalSolicitacoes;

        const entrada = await tx.creditSale.create({
          data: {
            clienteId: remessa.clienteId,
            userIdExecutor: responsavel,
            produtoId: modelo.produtoId,
            quantidadeCreditos: qtd,
            valor: 0,
            valorTotal: 0,
            status: 'confirmado',
            tipoTransacao: 'entrada',
            dataVenda: new Date(),
            observacao: `Cancelamento da remessa #${remessa.numeroRemessa}`,
          },
        });

        await this.registrarExtrato(tx, {
          clienteId: remessa.clienteId,
          produtoId: modelo.produtoId,
          tipoOperacao: 'estorno_cancelamento_remessa',
          direcaoMovimento: 'entrada',
          quantidadeCreditos: qtd,
          vendaCreditoId: entrada.id,
          remessaId: remessa.id,
          userIdResponsavel: responsavel,
          observacaoNegocio: `Estorno por cancelamento da remessa nº ${remessa.numeroRemessa}`,
        });
      }

      await tx.remessa.update({ where: { id }, data: this.mapUpdatePayload(payload) });
    });

    return true;
  }

  async delete(id: bigint): Promise<boolean> {
    const remessa = await this.prisma.remessa.findUnique({ where: { id } });
    if (!remessa) throw new BusinessException('Remessa não encontrada.', 404 as any);
    if (remessa.situacao === ('confirmado' as any)) {
      throw new Error('Não é possível excluir uma remessa já confirmada');
    }
    await this.repository.softDelete(id);
    return true;
  }

  // ----------------------------------------------------------- HELPERS
  private normalizarPosicao(posicao: string): RemessaPosicao {
    const valor = String(posicao).toUpperCase();
    if (valor === 'H' || valor === 'V') return valor as RemessaPosicao;
    throw new BusinessException('A posição da remessa deve ser h ou v.');
  }

  private mapUpdatePayload(data: Record<string, any>): Prisma.RemessaUncheckedUpdateInput {
    const out: Prisma.RemessaUncheckedUpdateInput = {};
    if (data.situacao !== undefined) out.situacao = data.situacao;
    if (data.status !== undefined) out.status = data.status;
    if (data.observacao !== undefined) out.observacao = data.observacao;
    if (data.posicao !== undefined) out.posicao = this.normalizarPosicao(data.posicao);
    if (data.user_id_executor !== undefined) {
      out.userIdExecutor = data.user_id_executor ? BigInt(data.user_id_executor) : null;
    }
    if (data.consultor_id !== undefined) {
      out.consultorId = data.consultor_id ? BigInt(data.consultor_id) : null;
    }
    if (data.data_inicio_producao !== undefined) out.dataInicioProducao = data.data_inicio_producao;
    if (data.data_fim_producao !== undefined) out.dataFimProducao = data.data_fim_producao;
    return out;
  }

  private async saldoCreditos(
    tx: Prisma.TransactionClient,
    clienteId: bigint,
    produtoId: bigint,
  ): Promise<number> {
    const rows = await tx.$queryRaw<{ saldo: bigint | null }[]>`
      SELECT CAST(SUM(
        CASE
          WHEN tipo_transacao = 'entrada' THEN quantidade_creditos
          WHEN tipo_transacao = 'saida' THEN -quantidade_creditos
          ELSE 0
        END
      ) AS SIGNED) AS saldo
      FROM vendas_creditos
      WHERE cliente_id = ${clienteId} AND produto_id = ${produtoId} AND status = 'confirmado'`;
    return Number(rows[0]?.saldo ?? 0);
  }

  private async gerarNumeroRemessa(tx: Prisma.TransactionClient): Promise<bigint> {
    const agg = await tx.remessa.aggregate({ _max: { numeroRemessa: true } });
    const ultimo = agg._max.numeroRemessa;
    return ultimo ? ultimo + BigInt(1) : BigInt(50000);
  }

  private validarConsistencia(total: number, qtdCsv: number, qtdZip: number | null): void {
    const divergencias: string[] = [];
    if (total !== qtdCsv) {
      divergencias.push(`total_solicitacoes (${total}) difere da planilha (${qtdCsv})`);
    }
    if (qtdZip !== null) {
      if (total !== qtdZip) divergencias.push(`total_solicitacoes (${total}) difere do ZIP (${qtdZip})`);
      if (qtdCsv !== qtdZip) divergencias.push(`planilha (${qtdCsv}) difere do ZIP (${qtdZip})`);
    }
    if (divergencias.length === 0) return;
    throw new BusinessException(
      `Inconsistência detectada na remessa: ${divergencias.join('; ')}. Verifique se total_solicitacoes, planilha e ZIP possuem a mesma quantidade.`,
    );
  }

  private async extrairRegistrosPlanilha(
    file: UploadFile,
    modelo: any,
    campoChaveLower: string,
  ): Promise<Record<string, { matricula: string; nome: string }>> {
    const ext = (file.originalname.split('.').pop() ?? '').toLowerCase();
    const { headers, rows } = await this.spreadsheet.parse(file.buffer, ext);

    if (!headers.includes(campoChaveLower)) {
      throw new BusinessException(`A coluna '${campoChaveLower}' não existe na planilha.`);
    }

    const obrigatorias = this.nomesColunasObrigatorias(modelo, campoChaveLower);
    const nomeHeader = headers.find((h) => h.includes('nome'));

    const dados: Record<string, { matricula: string; nome: string }> = {};
    for (const row of rows) {
      const matricula = String(row[campoChaveLower] ?? '').trim();
      if (matricula === '') continue;

      for (const col of obrigatorias) {
        if (!row[col] || String(row[col]).trim() === '') {
          throw new BusinessException(
            `Registro com matrícula '${matricula}': a coluna obrigatória '${col}' está vazia ou ausente.`,
          );
        }
      }

      const nome = nomeHeader ? String(row[nomeHeader] ?? '').trim() || 'N/A' : 'N/A';
      dados[matricula] = { matricula, nome };
    }

    if (Object.keys(dados).length === 0) {
      throw new BusinessException('A planilha não contém registros válidos.');
    }
    return dados;
  }

  private nomesColunasObrigatorias(modelo: any, campoChaveLower: string): string[] {
    const nomes = [campoChaveLower];
    const campos = [...(modelo.camposVariaveis ?? [])].sort((a, b) => a.ordem - b.ordem);
    for (const campo of campos) {
      if (Number(campo.obrigatorio) !== 1 && campo.obrigatorio !== true) continue;
      const nome = String(campo.nome ?? '').trim().toLowerCase();
      if (nome !== '') nomes.push(nome);
    }
    return [...new Set(nomes)];
  }

  private async preScanZip(
    file: UploadFile,
    dadosCsv: Record<string, { matricula: string; nome: string }>,
  ): Promise<number> {
    const entries = await this.zip.extract(file.buffer);
    let n = 0;
    for (const entry of entries) {
      const matricula = entry.name.replace(/\.[^.]+$/, '').trim();
      if (!dadosCsv[matricula]) {
        throw new BusinessException(`Matrícula '${matricula}' não encontrada na planilha.`);
      }
      n++;
    }
    return n;
  }

  private async persistirPlanilha(
    tx: Prisma.TransactionClient,
    remessaId: bigint,
    file: UploadFile,
    clienteId: bigint,
    storedFiles: string[],
  ): Promise<void> {
    const ext = (file.originalname.split('.').pop() ?? '').toLowerCase();
    const path = `remessas/${remessaId}/planilhas/${uuidv4()}.${ext}`;
    await this.storage.put(path, file.buffer);
    storedFiles.push(path);
    await tx.remessaPlanilha.create({
      data: { remessaId, clienteId, filePath: path, tipo: ext },
    });
  }

  private async persistirFotos(
    tx: Prisma.TransactionClient,
    remessaId: bigint,
    file: UploadFile,
    dadosCsv: Record<string, { matricula: string; nome: string }>,
    clienteId: bigint,
    storedFiles: string[],
  ): Promise<void> {
    const entries = await this.zip.extract(file.buffer);
    for (const entry of entries) {
      const matricula = entry.name.replace(/\.[^.]+$/, '').trim();
      if (!dadosCsv[matricula]) {
        throw new BusinessException(`Matrícula '${matricula}' não encontrada na planilha.`);
      }
      let jpeg: Buffer;
      try {
        jpeg = await this.image.toJpeg(entry.buffer, 90);
      } catch {
        throw new BusinessException(`Erro ao converter imagem '${entry.name}' para JPG.`);
      }
      const path = `remessas/${remessaId}/fotos/${matricula}.jpg`;
      await this.storage.put(path, jpeg);
      storedFiles.push(path);
      await tx.remessaFoto.create({
        data: {
          remessaId,
          clienteId,
          filePath: path,
          nome: dadosCsv[matricula].nome,
          matricula,
        },
      });
    }
  }

  private async consumirCreditos(
    tx: Prisma.TransactionClient,
    clienteId: bigint,
    produtoId: bigint,
    qtd: number,
    remessa: { id: bigint; numeroRemessa: bigint },
    userIdSolicitante: string | number | null,
  ): Promise<void> {
    const responsavel = userIdSolicitante ? BigInt(userIdSolicitante) : clienteId;

    const saida = await tx.creditSale.create({
      data: {
        clienteId,
        userIdExecutor: responsavel,
        produtoId,
        valor: 0,
        valorTotal: 0,
        quantidadeCreditos: qtd,
        tipoTransacao: 'saida',
        status: 'confirmado',
        dataVenda: new Date(),
        observacao: `Consumo de créditos — remessa #${remessa.numeroRemessa}`,
      },
    });

    await this.registrarExtrato(tx, {
      clienteId,
      produtoId,
      tipoOperacao: 'consumo_remessa',
      direcaoMovimento: 'saida',
      quantidadeCreditos: qtd,
      vendaCreditoId: saida.id,
      remessaId: remessa.id,
      userIdResponsavel: responsavel,
      observacaoNegocio: `Consumo referente à remessa nº ${remessa.numeroRemessa}`,
    });
  }

  /** Espelha CreditoClienteExtratoService::registrarLinha (saldo pós-movimento). */
  private async registrarExtrato(
    tx: Prisma.TransactionClient,
    attrs: {
      clienteId: bigint;
      produtoId: bigint;
      tipoOperacao: string;
      direcaoMovimento: string;
      quantidadeCreditos: number;
      vendaCreditoId?: bigint | null;
      remessaId?: bigint | null;
      userIdResponsavel?: bigint | null;
      observacaoNegocio?: string | null;
    },
  ): Promise<void> {
    const saldo = await this.saldoCreditos(tx, attrs.clienteId, attrs.produtoId);
    await tx.extratoMovimentacaoCreditoCliente.create({
      data: {
        clienteId: attrs.clienteId,
        produtoId: attrs.produtoId,
        tipoOperacao: attrs.tipoOperacao,
        direcaoMovimento: attrs.direcaoMovimento,
        quantidadeCreditos: attrs.quantidadeCreditos,
        saldoCreditosProdutoAposMovimento: BigInt(Math.max(0, saldo)),
        vendaCreditoId: attrs.vendaCreditoId ?? null,
        remessaId: attrs.remessaId ?? null,
        userIdResponsavel: attrs.userIdResponsavel ?? null,
        observacaoNegocio: attrs.observacaoNegocio ?? null,
      },
    });
  }
}
