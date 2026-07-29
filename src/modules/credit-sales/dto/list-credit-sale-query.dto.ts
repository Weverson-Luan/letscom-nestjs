import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
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
