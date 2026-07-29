import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from 'src/shared/dto/pagination-query.dto';

export class DashboardAtividadesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: '1', description: 'Filtrar por user_id' })
  @IsOptional()
  @IsString()
  user_id?: string;

  @ApiPropertyOptional({ example: 'login', description: 'Filtrar por evento' })
  @IsOptional()
  @IsString()
  evento?: string;

  @ApiPropertyOptional({ example: '/apiparcelas/users', description: 'Filtrar por rota' })
  @IsOptional()
  @IsString()
  rota?: string;

  @ApiPropertyOptional({ example: '2026-07-01', description: 'Data início (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  data_inicio?: string;

  @ApiPropertyOptional({ example: '2026-07-18', description: 'Data fim (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  data_fim?: string;
}
