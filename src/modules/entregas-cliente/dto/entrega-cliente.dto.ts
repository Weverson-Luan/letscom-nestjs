import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateEntregaClienteDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  remessa_id!: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  responsavel_recebimento!: string;
}

export class UpdateEntregaClienteDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  responsavel_recebimento?: string;
}
