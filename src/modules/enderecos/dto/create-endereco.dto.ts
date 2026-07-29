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
  MaxLength,
  Min,
} from 'class-validator';

export class CreateEnderecoDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsNumber({}, { message: 'O user_id é obrigatório.' })
  @Min(1)
  user_id!: number;

  @ApiProperty({ example: 'Rua Exemplo' })
  @IsString()
  @IsNotEmpty({ message: 'O logradouro é obrigatório.' })
  @MaxLength(255)
  logradouro!: string;

  @ApiProperty({ example: '123' })
  @IsString()
  @IsNotEmpty({ message: 'O número é obrigatório.' })
  @MaxLength(50)
  numero!: string;

  @ApiPropertyOptional({ example: 'Sala 5' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  complemento?: string;

  @ApiProperty({ example: 'Centro' })
  @IsString()
  @IsNotEmpty({ message: 'O bairro é obrigatório.' })
  @MaxLength(255)
  bairro!: string;

  @ApiProperty({ example: 'Belo Horizonte' })
  @IsString()
  @IsNotEmpty({ message: 'A cidade é obrigatória.' })
  @MaxLength(255)
  cidade!: string;

  @ApiProperty({ example: 'MG' })
  @IsString()
  @IsNotEmpty({ message: 'O estado é obrigatório.' })
  @MaxLength(50)
  estado!: string;

  @ApiProperty({ example: '30130-000' })
  @IsString()
  @IsNotEmpty({ message: 'O CEP é obrigatório.' })
  @MaxLength(20)
  cep!: string;

  @ApiProperty({
    enum: ['residencial', 'entrega', 'cobranca', 'outro'],
    example: 'residencial',
  })
  @IsIn(['residencial', 'entrega', 'cobranca', 'outro'], {
    message: 'tipo_endereco inválido.',
  })
  tipo_endereco!: 'residencial' | 'entrega' | 'cobranca' | 'outro';

  @ApiProperty({ example: 'Pedro Lucas Silva' })
  @IsString()
  @IsNotEmpty({ message: 'O nome do responsável é obrigatório.' })
  @MaxLength(255)
  nome_responsavel!: string;

  @ApiProperty({ example: 'contato@empresa.com' })
  @IsEmail({}, { message: 'O e-mail deve ser válido.' })
  email!: string;

  @ApiProperty({ example: 'Administrativo' })
  @IsString()
  @IsNotEmpty({ message: 'O setor é obrigatório.' })
  @MaxLength(255)
  setor!: string;

  @ApiProperty({ example: '31999999999' })
  @IsString()
  @IsNotEmpty({ message: 'O telefone é obrigatório.' })
  @MaxLength(30)
  telefone!: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
