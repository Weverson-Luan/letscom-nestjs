import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { normalizarTipoTransacao } from './create-credit-sale.dto';

/** Update parcial — não permite alterar vendas confirmadas/canceladas (regra no service). */
export class UpdateCreditSaleDto {
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
  @Min(0)
  quantidade_creditos?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  valor?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  valor_total?: number;

  @ApiPropertyOptional({ enum: ['entrada', 'saida'] })
  @IsOptional()
  @Transform(({ value }) => normalizarTipoTransacao(value))
  @IsIn(['entrada', 'saida'])
  tipo_transacao?: 'entrada' | 'saida';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observacao?: string;
}
