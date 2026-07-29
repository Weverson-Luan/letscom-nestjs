import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateRemessaLiberadaClienteDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  remessa_id?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  user_id_executor?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  tipo_entrega_id?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  file_path?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  data_entrega?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observacao?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  outros?: string | null;
}
