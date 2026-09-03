/**
 * IMPORTS
 */

import { Injectable } from '@nestjs/common';
import sharp from 'sharp';

/**
 * Processamento de imagens
 * (RemessaService::persistirFotosRemessa -> ->toJpeg(90)): normaliza cada foto
 * para JPEG com qualidade 90. Sem redimensionamento dimensional.
 */
@Injectable()
 class ImageService {
  async toJpeg(input: Buffer, quality = 90): Promise<Buffer> {
    return sharp(input).jpeg({ quality }).toBuffer();
  }
}

/**
 * EXPORT
 */
export { ImageService };