import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class LiberarRemessaClienteDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsNumber({}, { message: 'remessa_id é obrigatório.' })
  @Min(1)
  remessa_id!: number;

  /** Mantido por compatibilidade com o Laravel; o executor real é o usuário autenticado. */
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsNumber({}, { message: 'user_id_executor é obrigatório.' })
  @Min(1)
  user_id_executor!: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsNumber({}, { message: 'tipo_entrega_id é obrigatório.' })
  @Min(1)
  tipo_entrega_id!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observacao?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  outros?: string;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Arquivo anexo (multipart)',
  })
  @IsOptional()
  file_path?: any;
}
