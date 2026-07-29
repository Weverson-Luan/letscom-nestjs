import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

/** Espelha ProductRequest (PUT) — campos opcionais (required removido). */
export class UpdateProductDto {
  @ApiPropertyOptional({ example: 'SEM CHIP' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nome?: string;

  @ApiPropertyOptional({ example: 15.0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'O valor deve ser um número' })
  @Min(0)
  valor?: number;

  @ApiPropertyOptional({ example: 1.5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'O valor em créditos deve ser um número' })
  @Min(0)
  valor_creditos?: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  estoque_minimo?: number;

  @ApiPropertyOptional({ example: 10000000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  estoque_maximo?: number;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  estoque_atual?: number;
}
