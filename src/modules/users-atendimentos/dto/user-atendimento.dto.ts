import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateUserAtendimentoDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  user_id!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nome?: string;

  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  telefone!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  documento?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}

export class UpdateUserAtendimentoDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nome?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  telefone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  documento?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
