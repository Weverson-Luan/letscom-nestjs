import { ApiPropertyOptional } from '@nestjs/swagger';
import { ClienteAnotacaoTipo } from '@prisma/client';
import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from 'src/shared/dto/pagination-query.dto';
import { TIPOS_ANOTACAO } from '../clientes-anotacoes.constants';

export class ListarAnotacoesClienteQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: TIPOS_ANOTACAO, description: 'Filtra por tipo' })
  @IsOptional()
  @IsIn(TIPOS_ANOTACAO, { message: 'Tipo de anotação inválido.' })
  tipo?: ClienteAnotacaoTipo;
}
