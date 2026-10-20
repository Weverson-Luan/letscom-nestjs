import { ApiProperty } from '@nestjs/swagger';
import { IsHexadecimal, IsNotEmpty, IsString, Length } from 'class-validator';

export class TrocarCodigoAcessoBackofficeDto {
  @ApiProperty({ description: 'Código de uso único gerado no portal (64 caracteres hex).' })
  @IsString()
  @IsNotEmpty()
  @IsHexadecimal()
  @Length(64, 64)
  codigo!: string;
}
