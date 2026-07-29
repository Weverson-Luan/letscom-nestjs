import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/** Espelha a validação inline do TecnologiasController@store. */
export class CreateTecnologiaDto {
  @ApiProperty({ example: 'RFID Mifare 13,56Mhz' })
  @IsString({ message: 'O nome da tecnologia é obrigatório.' })
  @IsNotEmpty({ message: 'O nome da tecnologia é obrigatório.' })
  @MaxLength(255)
  nome!: string;

  @ApiPropertyOptional({ example: 'Tecnologia de rádio frequência para leitura segura.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  descricao?: string;

  @ApiProperty({ example: true })
  @IsBoolean({ message: 'O campo ativo deve ser verdadeiro ou falso.' })
  ativo!: boolean;
}
