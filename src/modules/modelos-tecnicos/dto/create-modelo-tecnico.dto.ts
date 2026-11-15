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

  /** Obrigatório só com carga de foto ou dados variáveis (validado no service). */
  @ApiPropertyOptional()
  // ausente continua ausente (não apaga o valor salvo numa edição parcial)
  @Transform(({ value }) => (value === undefined ? undefined : converterTextoVazioEmNulo(value)))
  @IsOptional()
  @IsString()
  @MaxLength(50)
  campo_chave?: string | null;

  @ApiProperty({ enum: ['horizontal', 'vertical'] })
  @IsIn(['horizontal', 'vertical'])
  posicionamento!: 'horizontal' | 'vertical';

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
