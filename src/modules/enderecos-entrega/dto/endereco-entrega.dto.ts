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

export class CreateEnderecoEntregaDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  user_id!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logradouro?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  numero!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  complemento?: string;

  @ApiProperty()
  @IsString()
  bairro!: string;

  @ApiProperty()
  @IsString()
  cidade!: string;

  @ApiProperty()
  @IsString()
  estado!: string;

  @ApiProperty()
  @IsString()
  cep!: string;

  @ApiProperty()
  @IsString()
  nome_responsavel!: string;

  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  setor!: string;

  @ApiProperty()
  @IsString()
  telefone!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}

export class UpdateEnderecoEntregaDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logradouro?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  numero?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  complemento?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bairro?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cidade?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  estado?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cep?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nome_responsavel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  setor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  telefone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
