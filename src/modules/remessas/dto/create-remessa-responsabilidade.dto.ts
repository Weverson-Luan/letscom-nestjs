import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreateRemessaResponsabilidadeDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsNumber({}, { message: 'O campo cliente_id é obrigatório!' })
  @Min(1)
  cliente_id!: number;

  @ApiProperty({ example: 'João da Silva' })
  @IsString()
  @IsNotEmpty({ message: 'O campo nome é obrigatório!' })
  nome!: string;

  @ApiProperty({ example: '12345678901', minLength: 11, maxLength: 20 })
  @IsString()
  @MinLength(11, { message: 'O documento deve ter entre 11 e 20 caracteres!' })
  @MaxLength(20, { message: 'O documento deve ter entre 11 e 20 caracteres!' })
  documento!: string;
}
