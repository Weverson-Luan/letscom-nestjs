import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateFeatureFlagDto {
  @ApiProperty({ example: 'nova-tela-remessas' })
  @IsString({ message: 'A chave da feature flag é obrigatória.' })
  @IsNotEmpty({ message: 'A chave da feature flag é obrigatória.' })
  @MaxLength(255)
  key!: string;

  @ApiProperty()
  @IsString({ message: 'O nome da feature flag é obrigatório.' })
  @IsNotEmpty({ message: 'O nome da feature flag é obrigatório.' })
  @MaxLength(255)
  nome!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descricao?: string;

  /** CSV de tipos de usuário; validado no service contra TIPOS_USUARIO_FEATURE_FLAG. */
  @ApiPropertyOptional({ example: 'admin,consultor' })
  @IsOptional()
  @IsString()
  tipo_usuario?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean({ message: 'O campo ativo deve ser verdadeiro ou falso.' })
  ativo?: boolean;
}
