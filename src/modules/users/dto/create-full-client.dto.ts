import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class FullClientClienteDto {
  @ApiProperty({ example: 'Empresa XYZ' })
  @IsString()
  @IsNotEmpty()
  nome!: string;

  @ApiProperty({ example: 'contato@empresa.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '12345678000199' })
  @IsString()
  @IsNotEmpty()
  documento!: string;

  @ApiProperty({ example: '11988887777' })
  @IsString()
  @IsNotEmpty()
  telefone!: string;

  @ApiProperty({ enum: ['F', 'J'], example: 'J' })
  @IsIn(['F', 'J'])
  tipo_pessoa!: 'F' | 'J';

  @ApiProperty({ example: 'senha123', minLength: 6 })
  @IsString()
  @MinLength(6)
  senha!: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  roles?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  consultor_id?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  tipo_entrega_id?: number;
}

export class FullClientEnderecoDto {
  @ApiProperty({ example: 'Rua das Flores' })
  @IsString()
  @IsNotEmpty()
  logradouro!: string;

  @ApiProperty({ example: '100' })
  @IsString()
  @IsNotEmpty()
  numero!: string;

  @ApiPropertyOptional({ example: 'Sala 2' })
  @IsOptional()
  @IsString()
  complemento?: string;

  @ApiProperty({ example: 'Centro' })
  @IsString()
  @IsNotEmpty()
  bairro!: string;

  @ApiProperty({ example: 'São Paulo' })
  @IsString()
  @IsNotEmpty()
  cidade!: string;

  @ApiProperty({ example: 'SP' })
  @IsString()
  @IsNotEmpty()
  estado!: string;

  @ApiProperty({ example: '01001000' })
  @IsString()
  @IsNotEmpty()
  cep!: string;

  @ApiProperty({ example: 'comercial' })
  @IsString()
  @IsNotEmpty()
  tipo_endereco!: string;

  @ApiProperty({ example: 'João Responsável' })
  @IsString()
  @IsNotEmpty()
  nome_responsavel!: string;

  @ApiProperty({ example: 'responsavel@empresa.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'RH' })
  @IsString()
  @IsNotEmpty()
  setor!: string;

  @ApiProperty({ example: '11977776666' })
  @IsString()
  @IsNotEmpty()
  telefone!: string;
}

export class FullClientUsuarioClienteDto {
  @ApiProperty({ example: 'sub@empresa.com' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ example: 'Subordinado' })
  @IsOptional()
  @IsString()
  nome?: string;

  @ApiProperty({ example: 'senha123' })
  @IsString()
  @IsNotEmpty()
  senha!: string;

  @ApiPropertyOptional({ example: '12345678901' })
  @IsOptional()
  @IsString()
  documento?: string;
}

export class CreateFullClientDto {
  @ApiProperty({ type: FullClientClienteDto })
  @ValidateNested()
  @Type(() => FullClientClienteDto)
  cliente!: FullClientClienteDto;

  @ApiProperty({ type: FullClientEnderecoDto })
  @ValidateNested()
  @Type(() => FullClientEnderecoDto)
  endereco!: FullClientEnderecoDto;

  @ApiPropertyOptional({ type: [FullClientUsuarioClienteDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FullClientUsuarioClienteDto)
  usuarios_cliente?: FullClientUsuarioClienteDto[];
}
