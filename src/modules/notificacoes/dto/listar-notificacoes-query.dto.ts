import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from 'src/shared/dto/pagination-query.dto';

export class ListarNotificacoesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['1', '0', 'true', 'false'], description: 'Só as não lidas' })
  @IsOptional()
  @IsIn(['1', '0', 'true', 'false'], { message: 'apenas_nao_lidas deve ser 1/0 ou true/false.' })
  apenas_nao_lidas?: string;
}
