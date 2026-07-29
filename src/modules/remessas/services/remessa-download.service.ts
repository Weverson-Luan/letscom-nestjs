import { Injectable, NotFoundException } from '@nestjs/common';
import AdmZip from 'adm-zip';
import { Readable } from 'stream';
import * as ExcelJS from 'exceljs';
import { BusinessException } from 'src/shared/exceptions/business.exception';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { StorageService } from 'src/shared/storage/storage.service';

export interface DownloadResult {
  buffer: Buffer;
  filename: string;
  contentType: string;
}

/**
 * Espelha RemessaController::downloadFotos e ::downloadPlanilha:
 * gera o ZIP das fotos e a planilha com a coluna "remessa" preenchida.
 */
@Injectable()
export class RemessaDownloadService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  private slug(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  async downloadFotos(id: bigint): Promise<DownloadResult> {
    const remessa = await this.prisma.remessa.findUnique({
      where: { id },
      include: { fotos: true, modeloTecnico: true },
    });
    if (!remessa) throw new NotFoundException('Remessa não encontrada.');
    this.assertNaoProvisoria(remessa.modeloTecnico);

    const zip = new AdmZip();
    for (const foto of remessa.fotos) {
      const path = (foto.filePath ?? '').trim();
      if (!path) continue;
      const content = await this.storage.download(path);
      if (content) {
        zip.addFile(path.split('/').pop() ?? path, content);
      }
    }

    const buffer = zip.toBuffer();
    if (buffer.length === 0) {
      throw new NotFoundException('Nenhuma foto encontrada ou falha ao gerar o ZIP.');
    }

    return {
      buffer,
      filename: `${remessa.numeroRemessa}.zip`,
      contentType: 'application/zip',
    };
  }

  async downloadPlanilha(id: bigint): Promise<DownloadResult> {
    const remessa = await this.prisma.remessa.findUnique({
      where: { id },
      include: { cliente: true, modeloTecnico: true },
    });
    if (!remessa) throw new NotFoundException('Remessa não encontrada.');
    this.assertNaoProvisoria(remessa.modeloTecnico);

    const planilha = await this.prisma.remessaPlanilha.findFirst({
      where: { remessaId: remessa.id },
    });
    if (!planilha || !planilha.filePath) {
      throw new BusinessException('Nenhum arquivo de planilha vinculado a esta remessa!', 200 as any);
    }

    const content = await this.storage.download(planilha.filePath);
    if (!content) {
      throw new BusinessException('Arquivo de planilha não encontrado no storage.', 200 as any);
    }

    const ext = (planilha.filePath.split('.').pop() ?? 'xlsx').toLowerCase();
    const campoChave = (remessa.modeloTecnico?.campoChave ?? '').trim().toLowerCase();
    if (campoChave === '') {
      throw new BusinessException('Campo chave não configurado no modelo técnico.');
    }

    const workbook = new ExcelJS.Workbook();
    if (ext === 'csv' || ext === 'txt') {
      await workbook.csv.read(Readable.from(content));
    } else {
      await workbook.xlsx.load(content as unknown as ExcelJS.Buffer);
    }

    const valorColunaRemessa = `R${remessa.numeroRemessa}`;
    this.aplicarColunaRemessa(workbook, valorColunaRemessa, campoChave);

    const clienteNome = this.slug(remessa.cliente?.nome ?? 'cliente');
    const modeloNome = this.slug(remessa.modeloTecnico?.nomeModelo ?? 'modelo');

    let buffer: Buffer;
    let contentType: string;
    if (ext === 'csv' || ext === 'txt') {
      buffer = Buffer.from(await workbook.csv.writeBuffer() as ArrayBuffer);
      contentType = ext === 'csv' ? 'text/csv' : 'text/plain';
    } else {
      buffer = Buffer.from(await workbook.xlsx.writeBuffer());
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    }

    return {
      buffer,
      filename: `${remessa.id}-${clienteNome}-${modeloNome}.${ext}`,
      contentType,
    };
  }

  /** Insere/atualiza a coluna "remessa" para linhas com campo chave preenchido. */
  private aplicarColunaRemessa(
    workbook: ExcelJS.Workbook,
    valor: string,
    campoChaveLower: string,
  ): void {
    const sheet = workbook.worksheets[0];
    if (!sheet) return;

    const headerRow = sheet.getRow(1);
    let colCampoChave: number | null = null;
    let colRemessa: number | null = null;

    headerRow.eachCell({ includeEmpty: true }, (cell, col) => {
      const header = String(cell.value ?? '').trim().toLowerCase();
      if (header === campoChaveLower) colCampoChave = col;
      if (header === 'remessa') colRemessa = col;
    });

    if (colCampoChave === null) {
      throw new BusinessException(`A coluna '${campoChaveLower}' não existe na planilha.`);
    }
    if (colRemessa === null) {
      colRemessa = sheet.columnCount + 1;
      sheet.getCell(1, colRemessa).value = 'remessa';
    }

    for (let r = 2; r <= sheet.rowCount; r++) {
      const chave = String(sheet.getCell(r, colCampoChave).value ?? '').trim();
      const cell = sheet.getCell(r, colRemessa);
      if (chave !== '') {
        cell.value = valor;
        cell.numFmt = '@';
      } else {
        cell.value = null;
      }
    }
    sheet.getColumn(colRemessa).numFmt = '@';
  }

  private assertNaoProvisoria(modelo: { isProvisorio?: boolean | null } | null): void {
    if (modelo?.isProvisorio) {
      throw new BusinessException('Download não disponível para remessas provisórias.', 403 as any);
    }
  }
}
