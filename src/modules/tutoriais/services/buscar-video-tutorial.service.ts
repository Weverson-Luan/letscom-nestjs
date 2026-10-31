/**
 * IMPORTS
 */
import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { basename } from 'path';

// shared
import { BusinessException } from 'src/shared/exceptions/business.exception';
import { StorageService } from 'src/shared/storage/storage.service';

/** Gera a URL assinada do vídeo tutorial configurado em `tutoriais.caminhoVideo`. */
@Injectable()
export class BuscarVideoTutorialService {
  constructor(
    private readonly storage: StorageService,
    private readonly config: ConfigService,
  ) {}

  async execute(): Promise<{ nome: string; url: string }> {
    const caminho = this.config.getOrThrow<string>('tutoriais.caminhoVideo');

    const existe = await this.storage.exists(caminho);
    if (!existe) {
      throw new BusinessException('Vídeo tutorial não encontrado.', HttpStatus.NOT_FOUND);
    }

    const url = await this.storage.getSignedUrl(caminho);
    return { nome: basename(caminho), url };
  }
}
