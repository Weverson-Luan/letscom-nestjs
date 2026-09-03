import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { basename } from 'path';
import { BusinessException } from 'src/shared/exceptions/business.exception';
import { StorageService } from 'src/shared/storage/storage.service';

@Injectable()
export class VideoTutorialService {
  constructor(
    private readonly storage: StorageService,
    private readonly config: ConfigService,
  ) {}

  async obterUrl(): Promise<{ nome: string; url: string }> {
    const path =
      this.config.get<string>('tutorials.videoPath') ??
      'videos-tutorias/video-tutotial-pequeno.mp4';

    const exists = await this.storage.exists(path);
    if (!exists) {
      throw new BusinessException(
        'Vídeo tutorial não encontrado.',
        HttpStatus.NOT_FOUND,
      );
    }

    const url = await this.storage.getSignedUrl(path);
    return { nome: basename(path), url };
  }
}
