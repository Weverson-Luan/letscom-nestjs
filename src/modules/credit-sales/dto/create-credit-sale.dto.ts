import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

/** Aceita Entrada/Saída do front e normaliza para entrada/saida. */
export function normalizarTipoTransacao(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const v = value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (v === 'entrada' || v === 'saida') return v;
  return value;
}

export class CreateCreditSaleDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsNumber({}, { message: 'O cliente_id é obrigatório.' })
  @Min(1)
  cliente_id!: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  user_id_executor?: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsNumber({}, { message: 'O produto_id é obrigatório.' })
  @Min(1)
  produto_id!: number;

  @ApiProperty({ example: 15 })
  @Type(() => Number)
  @IsNumber({}, { message: 'A quantidade de créditos é obrigatória' })
  @Min(0, { message: 'A quantidade de créditos não pode ser negativa!' })
  quantidade_creditos!: number;

  @ApiProperty({ enum: ['entrada', 'saida'], example: 'entrada' })
  @Transform(({ value }) => normalizarTipoTransacao(value))
  @IsIn(['entrada', 'saida'], { message: 'tipo_transacao deve ser entrada ou saida.' })
  tipo_transacao!: 'entrada' | 'saida';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observacao?: string;

  @ApiPropertyOptional({ enum: ['pendente', 'confirmado'] })
  @IsOptional()
  @IsIn(['pendente', 'confirmado'])
  status?: 'pendente' | 'confirmado';
}
