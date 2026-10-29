/**
 * IMPORTS
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class EnviarPlanilhaRemessaDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Arquivo da planilha (CSV/XLSX)',
  })
  file!: unknown;

  @ApiPropertyOptional({
    example: 'solicitacao',
    description: 'Tipo da planilha (default: extensão do arquivo)',
  })
  @IsOptional()
  @IsString()
  tipo?: string;

  /** Aceito por compatibilidade com o front; o cliente vem sempre da remessa. */
  @ApiPropertyOptional({ example: '1', description: 'ID do cliente (ignorado)' })
  @IsOptional()
  @IsString()
  cliente_id?: string;
}
