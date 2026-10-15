import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UploadFotosRemessaDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Arquivo ZIP com as fotos',
  })
  zip_file!: any;
}

export class UploadPlanilhaRemessaDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Arquivo da planilha (CSV/XLSX)',
  })
  file!: any;

  @ApiPropertyOptional({ example: 'solicitacao', description: 'Tipo da planilha' })
  @IsOptional()
  @IsString()
  tipo?: string;

  @ApiPropertyOptional({ example: '1', description: 'ID do cliente (opcional)' })
  @IsOptional()
  @IsString()
  cliente_id?: string;
}
