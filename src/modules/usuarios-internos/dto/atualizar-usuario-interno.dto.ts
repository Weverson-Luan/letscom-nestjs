import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  Equals,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';

export const MENSAGEM_EMAIL_NAO_ALTERAVEL = 'O e-mail não pode ser alterado.';

/** Edição de usuário interno: todos os dados, exceto e-mail (e papel, que não é alterável aqui). */
export class AtualizarUsuarioInternoDto {
  @ApiPropertyOptional({ example: 'Maria Silva' })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'O nome não pode ficar vazio.' })
  nome?: string;

  @ApiPropertyOptional({ example: '11999999999' })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'O telefone não pode ficar vazio.' })
  telefone?: string;

  @ApiPropertyOptional({ example: '12345678901', nullable: true })
  @ValidateIf((_, valor) => valor !== undefined && valor !== null)
  @IsString()
  documento?: string | null;

  @ApiPropertyOptional({ enum: ['F', 'J'] })
  @IsOptional()
  @IsIn(['F', 'J'], { message: 'O tipo de pessoa deve ser F ou J.' })
  tipo_pessoa?: 'F' | 'J';

  @ApiPropertyOptional({ minLength: 6, description: 'Em branco/ausente mantém a senha atual' })
  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'A senha deve ter pelo menos 6 caracteres.' })
  senha?: string;

  @ApiPropertyOptional({ example: true, description: 'Ativa/inativa o usuário' })
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;

  /** Declarado só para ser rejeitado: qualquer valor enviado gera erro de validação. */
  @ValidateIf((_, valor) => valor !== undefined)
  @Equals(undefined, { message: MENSAGEM_EMAIL_NAO_ALTERAVEL })
  email?: never;
}
