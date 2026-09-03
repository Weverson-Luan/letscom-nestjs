import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoEntregaValor } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
} from 'class-validator';

export class CreateTipoEntregaDto {
  @ApiPropertyOptional({ enum: TipoEntregaValor })
  @IsOptional()
  @IsEnum(TipoEntregaValor)
  tipo?: TipoEntregaValor;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}

export class UpdateTipoEntregaDto {
  @ApiPropertyOptional({ enum: TipoEntregaValor })
  @IsOptional()
  @IsEnum(TipoEntregaValor)
  tipo?: TipoEntregaValor;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}

export class VincularTipoEntregaDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  cliente_id!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  tipo_entrega_id!: number;
}
