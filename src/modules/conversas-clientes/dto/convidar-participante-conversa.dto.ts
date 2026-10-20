import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsPositive } from 'class-validator';

/** Informe exatamente um: `user_id` (interno ou cliente principal) ou `subordinado_id`. */
export class ConvidarParticipanteConversaDto {
  @ApiPropertyOptional({ example: 12, description: 'users.id (interno ou cliente principal)' })
  @IsOptional()
  @IsInt({ message: 'Usuário inválido.' })
  @IsPositive({ message: 'Usuário inválido.' })
  user_id?: number;

  @ApiPropertyOptional({ example: 3, description: 'users_cliente.id (subordinado do cliente)' })
  @IsOptional()
  @IsInt({ message: 'Subordinado inválido.' })
  @IsPositive({ message: 'Subordinado inválido.' })
  subordinado_id?: number;
}
