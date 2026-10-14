import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from 'src/shared/dto/pagination-query.dto';
import { PAPEIS_INTERNOS, PapelInterno } from '../usuarios-internos.constants';

export class ListarUsuariosInternosQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: PAPEIS_INTERNOS, description: 'Filtra por papel' })
  @IsOptional()
  @IsIn(PAPEIS_INTERNOS, { message: 'O papel deve ser consultor, producao ou recepcao.' })
  papel?: PapelInterno;
}
