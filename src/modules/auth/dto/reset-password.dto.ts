import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

/**
 * Espelha a validação do PasswordResetController::resetPassword:
 * token obrigatório, senha (min 6) e nova_senha igual a senha.
 * A igualdade nova_senha == senha é verificada no use-case (o Laravel usa
 * `same:senha`).
 */
export class ResetPasswordDto {
  @ApiProperty({ example: 'abc123token', description: 'Token recebido por e-mail' })
  @IsNotEmpty({ message: 'O token é obrigatório.' })
  token: string;

  @ApiProperty({ example: 'senhaAtual123', minLength: 6 })
  @IsString()
  @IsNotEmpty({ message: 'A senha antiga é obrigatória.' })
  @MinLength(6, { message: 'A senha deve ter pelo menos 6 caracteres.' })
  senha: string;

  @ApiProperty({ example: 'senhaAtual123', description: 'Deve ser igual a `senha`' })
  @IsString()
  @IsNotEmpty({ message: 'A nova senha é obrigatória.' })
  nova_senha: string;
}
