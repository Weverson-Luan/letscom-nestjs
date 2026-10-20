import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/** Não estende PaginationQueryDto para limitar o tamanho da busca. */
export class ListarResponsaveisQueryDto {
  @ApiPropertyOptional({ example: '1', description: 'Número da página (default 1)' })
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional({ example: '20', description: 'Itens por página (default 20, máx. 50)' })
  @IsOptional()
  @IsString()
  per_page?: string;

  @ApiPropertyOptional({ description: 'Busca por nome, e-mail ou documento (CPF/CNPJ)' })
  @IsOptional()
  @IsString({ message: 'A busca deve ser um texto.' })
  @MaxLength(100, { message: 'A busca deve ter no máximo 100 caracteres.' })
  search?: string;
}
