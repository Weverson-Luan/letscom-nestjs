import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const STATUS_VALIDOS = [
  'envio_de_dados',
  'em_producao',
  'conferido',
  'pedido_liberado',
  'concluido',
] as const;

const POSICAO_VALIDAS = ['h', 'H', 'v', 'V'] as const;

/** Body multipart de POST /remessas (campos + arquivos). */
export class SolicitarRemessaDto {
  @ApiProperty({ example: 1, description: 'ID do cliente' })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  cliente_id!: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Solicitante (usuário). Obrigatório se `users_solicitante_subordinado_id` não for enviado.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  user_id_solicitante_remessa?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Solicitante subordinado do portal. Alternativa a `user_id_solicitante_remessa`.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  users_solicitante_subordinado_id?: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  modelo_tecnico_id!: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  tecnologia_id!: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  produto_id!: number;

  @ApiProperty({ example: 50, minimum: 1 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  total_solicitacoes!: number;

  @ApiProperty({ example: 'pendente', description: 'Situação da remessa' })
  @IsString()
  @IsNotEmpty()
  situacao!: string;

  @ApiProperty({
    enum: STATUS_VALIDOS,
    example: 'envio_de_dados',
  })
  @IsIn([...STATUS_VALIDOS])
  status!: (typeof STATUS_VALIDOS)[number];

  @ApiProperty({
    enum: [...POSICAO_VALIDAS],
    example: 'h',
    description: 'Posição da remessa: h (horizontal) ou v (vertical)',
  })
  @IsIn([...POSICAO_VALIDAS])
  posicao!: (typeof POSICAO_VALIDAS)[number];

  @ApiProperty({
    example: 'João da Silva',
    description: 'Nome para ciência de responsabilidade',
  })
  @IsString()
  @IsNotEmpty()
  nome!: string;

  @ApiProperty({
    example: '12345678901',
    description: 'Documento (11–20 caracteres) para ciência de responsabilidade',
  })
  @IsString()
  @MinLength(11)
  @MaxLength(20)
  documento!: string;

  @ApiPropertyOptional({
    example: 'matricula}}',
    description: 'Campo-chave da planilha (obrigatório se enviar ZIP de fotos)',
  })
  @IsOptional()
  @IsString()
  campo_chave?: string;

  @ApiPropertyOptional({ description: 'Observações' })
  @IsOptional()
  @IsString()
  observacao?: string;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Planilha CSV/XLSX',
  })
  @IsOptional()
  csv_file?: any;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'ZIP com fotos (exige planilha + campo_chave)',
  })
  @IsOptional()
  zip_file?: any;
}
