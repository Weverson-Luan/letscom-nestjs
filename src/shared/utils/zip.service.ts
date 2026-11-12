import { HttpStatus, Injectable } from '@nestjs/common';
import * as unzipper from 'unzipper';
import { BusinessException } from '../exceptions/business.exception';
import {
  QUANTIDADE_MAXIMA_ENTRADAS_ZIP,
  TAMANHO_MAXIMO_ZIP_DESCOMPACTADO_BYTES,
} from '../upload/limites-upload';

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

    const arquivos = directory.files.filter((file) => file.type === 'File');
    const tamanhoDescompactado = arquivos.reduce((total, file) => total + file.uncompressedSize, 0);
    if (
      arquivos.length > QUANTIDADE_MAXIMA_ENTRADAS_ZIP ||
      tamanhoDescompactado > TAMANHO_MAXIMO_ZIP_DESCOMPACTADO_BYTES
    ) {
      throw new BusinessException(
        'O ZIP excede o limite de arquivos ou de tamanho descompactado.',
        HttpStatus.PAYLOAD_TOO_LARGE,
      );
    }

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
