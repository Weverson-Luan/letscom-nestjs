/**
 * IMPORTS
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEmail, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

// shared / utils
import { normalizarBooleano } from 'src/shared/utils/boolean-filter';

export class CriarUsuarioAtendimentoDto {
  @ApiProperty({ example: 1, description: 'ID do usuário (cliente) dono do atendimento' })
  @Type(() => Number)
  @IsInt()
  user_id!: number;

  @ApiPropertyOptional({ example: 'Atendente' })
  @IsOptional()
  @IsString()
  nome?: string;

  @ApiProperty({ example: 'atendimento@empresa.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '11999999999' })
  @IsString()
  @IsNotEmpty()
  telefone!: string;

  @ApiPropertyOptional({ example: '12345678901' })
  @IsOptional()
  @IsString()
  documento?: string;

  /** Lê o valor bruto: com enableImplicitConversion o `value` já chega por Boolean() ('false' viraria true). */
  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @Transform(({ obj, key }) => normalizarBooleano(obj[key]))
  @IsBoolean()
  ativo?: boolean;
}
