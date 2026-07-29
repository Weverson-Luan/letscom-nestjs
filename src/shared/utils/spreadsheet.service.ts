import { Injectable } from '@nestjs/common';
import { parse as parseCsv } from 'csv-parse/sync';
import * as ExcelJS from 'exceljs';

export interface ParsedSheet {
  /** cabeçalhos em minúsculas/trim, na ordem original */
  headers: string[];
  /** cada linha como objeto { header_minusculo: valor } */
  rows: Record<string, string>[];
}

/**
 * Import/export de planilhas espelhando league/csv + phpspreadsheet e o
 * RemessaPlanilhaExportHelper do Laravel (colunas sensíveis exportadas como texto
 * para evitar auto-conversão do Excel).
 */
@Injectable()
export class SpreadsheetService {
  /** Fragmentos de cabeçalho que indicam coluna a exportar como TEXTO. */
  private static readonly FRAGMENTOS_TEXTO = [
    'cpf', 'cnpj', 'cep', 'telefone', 'fone', 'celular', 'matricula', 'codigo',
    'documento', 'remessa', 'rg', 'pis', 'nit', 'inscricao', 'identificador',
    'chave', 'nascimento', 'admissao', 'validade', 'vencimento', 'emissao',
    'serie', 'titulo', 'eleitor', 'passaporte', 'cnh', 'carteira', 'funcional',
    'cracha', 'badge', 'rfid', 'uid', 'ddd', 'data', 'date', 'datanascimento',
    'dataadmissao', 'datavencimento', 'dataemissao',
  ];

  // ---------------------------------------------------------------- IMPORT

  async parse(buffer: Buffer, extension: string): Promise<ParsedSheet> {
    const ext = extension.toLowerCase().replace(/^\./, '');

    if (ext === 'csv' || ext === 'txt') {
      return this.parseCsvBuffer(buffer);
    }
    if (ext === 'xlsx' || ext === 'xls') {
      return this.parseExcelBuffer(buffer);
    }
    throw new Error(
      `Formato de planilha não suportado (${ext}). Use CSV, TXT, XLS ou XLSX.`,
    );
  }

  private parseCsvBuffer(buffer: Buffer): ParsedSheet {
    const records: Record<string, string>[] = parseCsv(buffer, {
      columns: (header: string[]) => header.map((h) => String(h).trim().toLowerCase()),
      skip_empty_lines: true,
      relax_column_count: true,
      trim: true,
      bom: true,
    });

    const headers = records.length > 0 ? Object.keys(records[0]) : [];
    return { headers, rows: records };
  }

  private async parseExcelBuffer(buffer: Buffer): Promise<ParsedSheet> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    const sheet = workbook.worksheets[0];

    const headers: string[] = [];
    const headerRow = sheet.getRow(1);
    headerRow.eachCell({ includeEmpty: true }, (cell) => {
      headers.push(String(cell.value ?? '').trim().toLowerCase());
    });

    const rows: Record<string, string>[] = [];
    for (let r = 2; r <= sheet.rowCount; r++) {
      const row = sheet.getRow(r);
      const obj: Record<string, string> = {};
      let hasValue = false;
      headers.forEach((header, idx) => {
        const cell = row.getCell(idx + 1);
        const value = this.cellToString(cell.value);
        if (value !== '') hasValue = true;
        obj[header] = value;
      });
      if (hasValue) rows.push(obj);
    }

    return { headers, rows };
  }

  // ---------------------------------------------------------------- EXPORT

  /**
   * Normaliza um cabeçalho: minúsculas, sem acentos, apenas [a-z0-9].
   * Espelha RemessaPlanilhaExportHelper::normalizarCabecalhoColuna.
   */
  normalizarCabecalho(header?: string): string {
    const texto = String(header ?? '').trim().toLowerCase();
    if (texto === '') return '';
    const semAcento = texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return semAcento.replace(/[^a-z0-9]/g, '');
  }

  colunaDeveSerTexto(header?: string, extrasNormalizados: string[] = []): boolean {
    const normalizado = this.normalizarCabecalho(header);
    if (normalizado === '') return false;
    if (extrasNormalizados.includes(normalizado)) return true;
    return SpreadsheetService.FRAGMENTOS_TEXTO.some((frag) => normalizado.includes(frag));
  }

  /**
   * Gera um XLSX a partir de headers + linhas, forçando como texto as colunas
   * sensíveis (por fragmento) e as informadas em `colunasSempreTexto`.
   */
  async buildXlsx(
    headers: string[],
    rows: Record<string, unknown>[],
    colunasSempreTexto: string[] = [],
    extrasNormalizados: string[] = [],
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Planilha');
    const sempreTexto = colunasSempreTexto.map((c) => this.normalizarCabecalho(c));

    sheet.addRow(headers);

    for (const row of rows) {
      sheet.addRow(headers.map((h) => row[h] ?? ''));
    }

    headers.forEach((header, idx) => {
      const norm = this.normalizarCabecalho(header);
      const deveSerTexto =
        sempreTexto.includes(norm) || this.colunaDeveSerTexto(header, extrasNormalizados);
      if (deveSerTexto) {
        const col = sheet.getColumn(idx + 1);
        col.numFmt = '@';
        col.eachCell({ includeEmpty: false }, (cell) => {
          cell.numFmt = '@';
          if (cell.value !== null && cell.value !== undefined) {
            cell.value = String(cell.value);
          }
        });
      }
    });

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }

  private cellToString(value: ExcelJS.CellValue): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') {
      if (value instanceof Date) return value.toISOString();
      if ('text' in value && value.text) return String(value.text);
      if ('result' in value && value.result !== undefined) return String(value.result);
      if ('richText' in value && Array.isArray((value as any).richText)) {
        return (value as any).richText.map((rt: any) => rt.text).join('');
      }
    }
    return String(value).trim();
  }
}
