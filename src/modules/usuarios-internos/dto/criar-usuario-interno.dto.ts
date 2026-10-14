import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { PAPEIS_INTERNOS, PapelInterno } from '../usuarios-internos.constants';

export class CriarUsuarioInternoDto {
  @ApiProperty({ example: 'Maria Silva' })
  @IsString()
  @IsNotEmpty({ message: 'O nome é obrigatório.' })
  nome!: string;

  @ApiProperty({ example: 'maria@letscom.com' })
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  @IsNotEmpty({ message: 'O e-mail é obrigatório.' })
  email!: string;

  @ApiProperty({ example: 'senha123', minLength: 6 })
  @IsString()
  @MinLength(6, { message: 'A senha deve ter pelo menos 6 caracteres.' })
  senha!: string;

  @ApiProperty({ example: '11999999999' })
  @IsString()
  @IsNotEmpty({ message: 'O telefone é obrigatório.' })
  telefone!: string;

  @ApiProperty({ enum: ['F', 'J'], example: 'F' })
  @IsIn(['F', 'J'], { message: 'O tipo de pessoa deve ser F ou J.' })
  tipo_pessoa!: 'F' | 'J';

  @ApiPropertyOptional({ example: '12345678901', description: 'CPF ou CNPJ' })
  @IsOptional()
  @IsString()
  documento?: string;

  @ApiProperty({ enum: PAPEIS_INTERNOS, example: 'consultor' })
  @IsIn(PAPEIS_INTERNOS, { message: 'O papel deve ser consultor, producao ou recepcao.' })
  papel!: PapelInterno;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
