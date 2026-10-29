/**
 * IMPORTS
 */
import { ApiProperty } from '@nestjs/swagger';

/** Só documenta o multipart no Swagger: o arquivo chega pelo FileInterceptor('zip_file'). */
export class EnviarFotosRemessaDto {
  @ApiProperty({ type: 'string', format: 'binary', description: 'Arquivo ZIP com as fotos' })
  zip_file!: unknown;
}
