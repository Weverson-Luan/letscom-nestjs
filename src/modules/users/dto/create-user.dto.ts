import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'Maria Silva' })
  @IsString()
  @IsNotEmpty({ message: 'O nome é obrigatório.' })
  nome!: string;

  @ApiProperty({ example: 'maria@empresa.com' })
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  @IsNotEmpty({ message: 'O e-mail é obrigatório.' })
  email!: string;

  @ApiProperty({ example: '12345678901', description: 'CPF ou CNPJ' })
  @IsString()
  @IsNotEmpty({ message: 'O documento é obrigatório.' })
  documento!: string;

  @ApiProperty({ example: '11999999999' })
  @IsString()
  @IsNotEmpty({ message: 'O telefone é obrigatório.' })
  telefone!: string;

  @ApiProperty({ enum: ['F', 'J'], example: 'F' })
  @IsIn(['F', 'J'], { message: 'O tipo de pessoa deve ser F ou J.' })
  tipo_pessoa!: 'F' | 'J';

  @ApiProperty({ example: 'senha123', minLength: 6 })
  @IsString()
  @MinLength(6, { message: 'A senha deve ter pelo menos 6 caracteres.' })
  senha!: string;

  @ApiPropertyOptional({ example: 1, description: 'ID da role' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  roles?: number;

  @ApiPropertyOptional({ example: 1, description: 'ID do consultor vinculado' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  consultor_id?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  tipo_entrega_id?: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
