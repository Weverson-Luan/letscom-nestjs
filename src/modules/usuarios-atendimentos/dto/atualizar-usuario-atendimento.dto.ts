/**
 * IMPORTS
 */
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEmail, IsOptional, IsString } from 'class-validator';

// shared / utils
import { normalizarBooleano } from 'src/shared/utils/boolean-filter';

export class AtualizarUsuarioAtendimentoDto {
  @ApiPropertyOptional({ example: 'Atendente' })
  @IsOptional()
  @IsString()
  nome?: string;

  @ApiPropertyOptional({ example: 'atendimento@empresa.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '11999999999' })
  @IsOptional()
  @IsString()
  telefone?: string;

  @ApiPropertyOptional({ example: '12345678901' })
  @IsOptional()
  @IsString()
  documento?: string;

  /** Lê o valor bruto: com enableImplicitConversion o `value` já chega por Boolean() ('false' viraria true). */
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(({ obj, key }) => normalizarBooleano(obj[key]))
  @IsBoolean()
  ativo?: boolean;
}
