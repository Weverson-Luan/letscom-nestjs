import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, Min } from 'class-validator';

/** Body de POST /produto-usuario/vincular e /desvincular. */
export class VincularProdutoDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt({ message: 'O user_id é obrigatório.' })
  @Min(1)
  @IsNotEmpty()
  user_id!: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt({ message: 'O produto_id é obrigatório.' })
  @Min(1)
  @IsNotEmpty()
  produto_id!: number;
}
