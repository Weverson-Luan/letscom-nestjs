import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

function toBool(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase().trim());
  }
  return Boolean(value);
}

export class CampoVariavelItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  modelo_tecnico_id?: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nome!: string;

  @ApiProperty()
  @Transform(({ value }) => toBool(value))
  @IsBoolean()
  obrigatorio!: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  ordem?: number;
}

export class SyncCamposVariaveisDto {
  @ApiProperty({ type: [CampoVariavelItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CampoVariavelItemDto)
  campos!: CampoVariavelItemDto[];
}

export class CreateCamposVariaveisDto {
  @ApiProperty({ type: [CampoVariavelItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CampoVariavelItemDto)
  campos!: CampoVariavelItemDto[];
}

export class UpdateCampoVariavelDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nome?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => toBool(value))
  @IsBoolean()
  obrigatorio?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  ordem?: number;
}
