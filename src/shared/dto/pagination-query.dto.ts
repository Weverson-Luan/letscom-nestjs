import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

/** Query params comuns de listagens paginadas. */
export class PaginationQueryDto {
  @ApiPropertyOptional({ example: '1', description: 'Número da página (default 1)' })
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional({
    example: '10',
    description: 'Itens por página (default 10, máx. 100). Aceita também `perPage`.',
  })
  @IsOptional()
  @IsString()
  per_page?: string;

  @ApiPropertyOptional({ example: '10' })
  @IsOptional()
  @IsString()
  perPage?: string;

  @ApiPropertyOptional({ example: '1', description: 'Alias de `page`' })
  @IsOptional()
  @IsString()
  pagina?: string;

  @ApiPropertyOptional({ description: 'Busca textual' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 'created_at', description: 'Campo de ordenação' })
  @IsOptional()
  @IsString()
  sort_by?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], example: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';
}
