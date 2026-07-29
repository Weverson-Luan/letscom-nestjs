import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class LiberarRemessaBalcaoDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsNumber({}, { message: 'remessa_id é obrigatório.' })
  @Min(1)
  remessa_id!: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsNumber({}, { message: 'tipo_entrega_id é obrigatório.' })
  @Min(1)
  tipo_entrega_id!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observacao?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  outros?: string;
}
