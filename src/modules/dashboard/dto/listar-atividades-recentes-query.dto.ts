import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export const ATIVIDADES_RECENTES_POR_PAGINA_PADRAO = 10;
export const ATIVIDADES_RECENTES_POR_PAGINA_MAXIMO = 50;

/** Query de GET /dashboard/atividades-recentes. Valores inválidos respondem 400. */
export class ListarAtividadesRecentesQueryDto {
  @ApiPropertyOptional({ example: 1, minimum: 1, default: 1, description: 'Página (>= 1)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({
    example: ATIVIDADES_RECENTES_POR_PAGINA_PADRAO,
    minimum: 1,
    maximum: ATIVIDADES_RECENTES_POR_PAGINA_MAXIMO,
    default: ATIVIDADES_RECENTES_POR_PAGINA_PADRAO,
    description: `Itens por página (1 a ${ATIVIDADES_RECENTES_POR_PAGINA_MAXIMO})`,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(ATIVIDADES_RECENTES_POR_PAGINA_MAXIMO)
  per_page: number = ATIVIDADES_RECENTES_POR_PAGINA_PADRAO;
}
