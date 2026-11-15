import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { normalizarBooleano } from 'src/shared/utils/boolean-filter';
import { converterTextoVazioEmNulo } from 'src/shared/utils/converter-texto-vazio-em-nulo';

/**
 * Lê o valor bruto do multipart: com enableImplicitConversion o `value` já chega
 * convertido por Boolean(), e '0' viraria true.
 */
const transformarBooleanoMultipart = ({
  obj,
  key,
}: {
  obj: Record<string, unknown>;
  key: string;
}) => normalizarBooleano(obj[key]);

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

  /** Vazio, 'undefined' ou 'null' limpam o campo (vira null). */
  @ApiPropertyOptional()
  // ausente continua ausente (não apaga o valor salvo numa edição parcial)
  @Transform(({ value }) => (value === undefined ? undefined : converterTextoVazioEmNulo(value)))
  @IsOptional()
  @IsString()
  @MaxLength(50)
  campo_chave?: string | null;

  @ApiPropertyOptional({ enum: ['horizontal', 'vertical'] })
  @IsOptional()
  @IsIn(['horizontal', 'vertical'])
  posicionamento?: 'horizontal' | 'vertical';

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(transformarBooleanoMultipart)
  @IsBoolean()
  tem_furo?: boolean;

  @ApiPropertyOptional({ enum: ['ovoide', 'redondo'] })
  @IsOptional()
  @IsIn(['ovoide', 'redondo'])
  tipo_furo?: 'ovoide' | 'redondo';

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(transformarBooleanoMultipart)
  @IsBoolean()
  tem_carga_foto?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(transformarBooleanoMultipart)
  @IsBoolean()
  tem_dados_variaveis?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(transformarBooleanoMultipart)
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
