import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { normalizarAtivo } from './normalizar-ativo';

export class CreateUserClienteDto {
  @ApiProperty({ example: 1, description: 'ID do cliente principal' })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  cliente_id!: number;

  @ApiProperty({ example: 'sub@empresa.com' })
  @IsEmail({}, { message: 'O e-mail é obrigatório.' })
  email!: string;

  @ApiProperty({ example: 'senha123' })
  @IsString()
  @IsNotEmpty({ message: 'A senha é obrigatória.' })
  @MinLength(6)
  senha!: string;

  @ApiPropertyOptional({ example: 'Usuário Subordinado' })
  @IsOptional()
  @IsString()
  nome?: string;

  @ApiPropertyOptional({ example: '12345678901' })
  @IsOptional()
  @IsString()
  documento?: string;

  @ApiPropertyOptional({ example: 1, description: 'Role (default: subordinado)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  role_id?: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @Transform(({ value }) => normalizarAtivo(value))
  @IsBoolean()
  ativo?: boolean;
}
