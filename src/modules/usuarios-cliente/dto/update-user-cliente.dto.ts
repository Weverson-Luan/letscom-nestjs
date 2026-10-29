import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { normalizarBooleano } from 'src/shared/utils/boolean-filter';

export class UpdateUserClienteDto {
  @ApiPropertyOptional({ example: 'sub@empresa.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'Usuário Subordinado' })
  @IsOptional()
  @IsString()
  nome?: string;

  @ApiPropertyOptional({ example: '12345678901' })
  @IsOptional()
  @IsString()
  documento?: string;

  @ApiPropertyOptional({ example: 'novaSenha123', minLength: 6 })
  @IsOptional()
  @IsString()
  @MinLength(6)
  senha?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(({ obj, key }) => normalizarBooleano(obj[key]))
  @IsBoolean()
  ativo?: boolean;
}
