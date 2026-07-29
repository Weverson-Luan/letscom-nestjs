import { Injectable } from '@nestjs/common';
import * as unzipper from 'unzipper';

export interface ZipEntry {
  /** nome do arquivo (basename, sem diretórios) */
  name: string;
  /** caminho completo dentro do zip */
  path: string;
  buffer: Buffer;
}

/**
 * Leitura de arquivos ZIP em memória (equivalente ao uso de ZipArchive no
 * Laravel para extrair as fotos da remessa). Ignora diretórios e entradas
 * ocultas de sistema (ex.: __MACOSX, .DS_Store).
 */
@Injectable()
export class ZipService {
  async extract(zipBuffer: Buffer): Promise<ZipEntry[]> {
    const directory = await unzipper.Open.buffer(zipBuffer);
    const entries: ZipEntry[] = [];

    for (const file of directory.files) {
      if (file.type !== 'File') continue;
      const base = file.path.split('/').pop() ?? file.path;
      if (base.startsWith('.') || file.path.includes('__MACOSX')) continue;

      const buffer = await file.buffer();
      entries.push({ name: base, path: file.path, buffer });
    }

    return entries;
  }
}
