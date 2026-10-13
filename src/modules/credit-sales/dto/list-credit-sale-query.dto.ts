import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { PaginationQueryDto } from 'src/shared/dto/pagination-query.dto';

export class CreditSaleListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: '1', description: 'Filtrar por produto' })
  @IsOptional()
  @IsString()
  produto_id?: string;

  @ApiPropertyOptional({ example: 'entrada', description: 'Tipo de operação (extrato)' })
  @IsOptional()
  @IsString()
  tipo_operacao?: string;

  @ApiPropertyOptional({ example: 'entrada', description: 'Direção do movimento (extrato)' })
  @IsOptional()
  @IsString()
  direcao_movimento?: string;

  @ApiPropertyOptional({ example: '123', description: 'Número da remessa (cobrança)' })
  @IsOptional()
  @IsString()
  numero_remessa?: string;

  @ApiPropertyOptional({ example: 'concluido', description: 'Status da remessa (cobrança)' })
  @IsOptional()
  @IsString()
  status_remessa?: string;

  @ApiPropertyOptional({ example: '2026-07-01' })
  @IsOptional()
  @IsString()
  data_inicio?: string;

  @ApiPropertyOptional({ example: '2026-07-18' })
  @IsOptional()
  @IsString()
  data_fim?: string;
}

/**
 * Query do extrato e da cobrança de créditos do cliente — espelha
 * ListarExtratoCreditoClienteRequest / ListarCobrancaCreditoClienteRequest
 * (`page` e `per_page` validados como inteiros).
 */
export class CreditoClienteQueryDto {
  @ApiPropertyOptional({ example: 1, description: 'Número da página (default 1)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'A página informada deve ser um número inteiro.' })
  @Min(1, { message: 'A página informada deve ser no mínimo 1.' })
  page?: number;

  @ApiPropertyOptional({ example: 15, description: 'Itens por página (default 15, máx. 100)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Itens por página deve ser um número inteiro.' })
  @Min(1, { message: 'Itens por página deve ser no mínimo 1.' })
  @Max(100, { message: 'Itens por página deve ser no máximo 100.' })
  per_page?: number;

  @ApiPropertyOptional({ example: 'created_at', description: 'Campo de ordenação' })
  @IsOptional()
  @IsString()
  sort_by?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], example: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'], { message: 'A ordem de classificação informada é inválida.' })
  order?: 'asc' | 'desc';

  @ApiPropertyOptional({ example: '1', description: 'Filtrar por produto' })
  @IsOptional()
  @IsString()
  produto_id?: string;

  @ApiPropertyOptional({ example: 'entrada', description: 'Tipo de operação (extrato)' })
  @IsOptional()
  @IsString()
  tipo_operacao?: string;

  @ApiPropertyOptional({ example: 'entrada', description: 'Direção do movimento (extrato)' })
  @IsOptional()
  @IsString()
  direcao_movimento?: string;

  @ApiPropertyOptional({ example: '123', description: 'Número da remessa (cobrança)' })
  @IsOptional()
  @IsString()
  numero_remessa?: string;

  @ApiPropertyOptional({ example: 'concluido', description: 'Status da remessa (cobrança)' })
  @IsOptional()
  @IsString()
  status_remessa?: string;

  @ApiPropertyOptional({ example: '2026-07-01' })
  @IsOptional()
  @IsString()
  data_inicio?: string;

  @ApiPropertyOptional({ example: '2026-07-18' })
  @IsOptional()
  @IsString()
  data_fim?: string;
}
