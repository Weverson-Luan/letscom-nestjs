import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateRemessaResponsabilidadeDto {
  @ApiPropertyOptional({ example: '12345678901' })
  @IsOptional()
  @IsString()
  numero_documento?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
