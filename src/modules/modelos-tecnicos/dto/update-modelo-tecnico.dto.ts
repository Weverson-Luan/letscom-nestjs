import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

function toBool(value: unknown): unknown {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1' || value === 1) return true;
  if (value === 'false' || value === '0' || value === 0) return false;
  return value;
}

export class UpdateModeloTecnicoDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  cliente_id?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  produto_id?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  tecnologia_id?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nome_modelo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  campo_chave?: string;

  @ApiPropertyOptional({ enum: ['horizontal', 'vertical'] })
  @IsOptional()
  @IsIn(['horizontal', 'vertical'])
  posicionamento?: 'horizontal' | 'vertical';

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => toBool(value))
  @IsBoolean()
  tem_furo?: boolean;

  @ApiPropertyOptional({ enum: ['ovoide', 'redondo'] })
  @IsOptional()
  @IsIn(['ovoide', 'redondo'])
  tipo_furo?: 'ovoide' | 'redondo';

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => toBool(value))
  @IsBoolean()
  tem_carga_foto?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => toBool(value))
  @IsBoolean()
  tem_dados_variaveis?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => toBool(value))
  @IsBoolean()
  is_provisorio?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  observacoes?: string;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Nova foto da frente (opcional)',
  })
  @IsOptional()
  foto_frente?: any;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Nova foto do verso (opcional)',
  })
  @IsOptional()
  foto_verso?: any;
}
