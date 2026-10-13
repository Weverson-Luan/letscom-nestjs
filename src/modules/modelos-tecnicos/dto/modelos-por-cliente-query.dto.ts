import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from 'src/shared/dto/pagination-query.dto';

/** Query de GET /modelo-tecnico/clientes/:id. */
export class ModelosPorClienteQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    example: '1',
    description: 'Inclui modelos inativos (apenas admin, produção e consultor)',
  })
  @IsOptional()
  @IsString()
  incluir_inativos?: string;
}
