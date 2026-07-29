import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

/** Espelha ProductRequest (POST) — sem campo `tecnologia` (não existe na tabela). */
export class CreateProductDto {
  @ApiProperty({ example: 'SEM CHIP' })
  @IsString({ message: 'O nome do produto é obrigatório' })
  @IsNotEmpty({ message: 'O nome do produto é obrigatório' })
  @MaxLength(255)
  nome!: string;

  @ApiProperty({ example: 15.0 })
  @Type(() => Number)
  @IsNumber({}, { message: 'O valor deve ser um número' })
  @Min(0, { message: 'O valor deve ser maior ou igual a zero' })
  valor!: number;

  @ApiProperty({ example: 1.5 })
  @Type(() => Number)
  @IsNumber({}, { message: 'O valor em créditos deve ser um número' })
  @Min(0, { message: 'O valor em créditos deve ser maior ou igual a zero' })
  valor_creditos!: number;

  @ApiProperty({ example: 100 })
  @Type(() => Number)
  @IsInt({ message: 'O estoque mínimo deve ser um inteiro' })
  @Min(0, { message: 'O estoque mínimo deve ser maior ou igual a zero' })
  estoque_minimo!: number;

  @ApiProperty({ example: 10000000 })
  @Type(() => Number)
  @IsInt({ message: 'O estoque máximo deve ser um inteiro' })
  @Min(0, { message: 'O estoque máximo deve ser maior ou igual a zero' })
  estoque_maximo!: number;

  @ApiProperty({ example: 500 })
  @Type(() => Number)
  @IsInt({ message: 'O estoque atual deve ser um inteiro' })
  @Min(0, { message: 'O estoque atual deve ser maior ou igual a zero' })
  estoque_atual!: number;
}
