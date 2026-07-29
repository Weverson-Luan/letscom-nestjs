import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
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

/** Campos de formulário multipart do store (fotos validadas no controller). */
export class CreateModeloTecnicoDto {
  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  cliente_id!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  produto_id!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  tecnologia_id!: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nome_modelo!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  campo_chave!: string;

  @ApiProperty({ enum: ['horizontal', 'vertical'] })
  @IsIn(['horizontal', 'vertical'])
  posicionamento!: 'horizontal' | 'vertical';

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

  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Foto da frente do modelo (obrigatória)',
  })
  foto_frente!: any;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Foto do verso do modelo (obrigatória)',
  })
  foto_verso!: any;
}
