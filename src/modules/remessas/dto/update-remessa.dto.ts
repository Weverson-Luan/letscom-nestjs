import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateRemessaDto {
  @ApiPropertyOptional({
    example: 'confirmado',
    description: 'Situação da remessa. Use `cancelada` junto com status `cancelada` para cancelar.',
  })
  @IsOptional()
  @IsString()
  situacao?: string;

  @ApiPropertyOptional({
    example: 'em_producao',
    description: 'Status do fluxo. `cancelada` estorna créditos e remove arquivos.',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 'Observação da remessa' })
  @IsOptional()
  @IsString()
  observacao?: string;

  @ApiPropertyOptional({ example: 'producao' })
  @IsOptional()
  @IsString()
  posicao?: string;

  @ApiPropertyOptional({ example: 1, description: 'Executor da remessa' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  user_id_executor?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  consultor_id?: number;

  @ApiPropertyOptional({ example: '2026-07-18T10:00:00.000Z' })
  @IsOptional()
  @IsString()
  data_inicio_producao?: string;

  @ApiPropertyOptional({ example: '2026-07-18T18:00:00.000Z' })
  @IsOptional()
  @IsString()
  data_fim_producao?: string;
}
