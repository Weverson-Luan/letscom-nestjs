import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ClienteCompromissoTipo } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { normalizarBooleano } from 'src/shared/utils/boolean-filter';
import { TAMANHO_MAXIMO_DESCRICAO, TAMANHO_MAXIMO_TITULO } from '../clientes-agenda.constants';
import { aparar } from './transformacoes-compromisso.helper';

export class CriarCompromissoClienteDto {
  @ApiProperty({ example: 'Apresentar proposta', maxLength: TAMANHO_MAXIMO_TITULO })
  @Transform(aparar)
  @IsString({ message: 'O título deve ser um texto.' })
  @IsNotEmpty({ message: 'O título é obrigatório.' })
  @MaxLength(TAMANHO_MAXIMO_TITULO, {
    message: `O título deve ter no máximo ${TAMANHO_MAXIMO_TITULO} caracteres.`,
  })
  titulo!: string;

  @ApiPropertyOptional({ enum: ClienteCompromissoTipo, default: ClienteCompromissoTipo.nota })
  @IsOptional()
  @IsEnum(ClienteCompromissoTipo, { message: 'Tipo de compromisso inválido.' })
  tipo?: ClienteCompromissoTipo;

  @ApiPropertyOptional({
    example: 'Levar amostras PVC',
    maxLength: TAMANHO_MAXIMO_DESCRICAO,
    nullable: true,
    description: '"" ou null = sem descrição',
  })
  @IsOptional()
  @IsString({ message: 'A descrição deve ser um texto.' })
  @MaxLength(TAMANHO_MAXIMO_DESCRICAO, {
    message: `A descrição deve ter no máximo ${TAMANHO_MAXIMO_DESCRICAO} caracteres.`,
  })
  descricao?: string | null;

  @ApiProperty({ example: '2026-10-21T14:00:00.000Z', description: 'Data/hora ISO 8601' })
  @IsISO8601({ strict: true }, { message: 'Informe a data do compromisso no formato ISO 8601.' })
  agendado_para!: string;

  @ApiPropertyOptional({
    example: 8,
    description: 'users.id de um usuário interno ativo ou do próprio cliente',
  })
  @IsOptional()
  @IsInt({ message: 'Responsável inválido.' })
  @IsPositive({ message: 'Responsável inválido.' })
  responsavel_id?: number;

  @ApiPropertyOptional({
    example: 3,
    description:
      'users_cliente.id de um subordinado ativo do cliente (exclusivo com responsavel_id)',
  })
  @IsOptional()
  @IsInt({ message: 'Responsável inválido.' })
  @IsPositive({ message: 'Responsável inválido.' })
  responsavel_subordinado_id?: number;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @Transform(({ obj, key }) => normalizarBooleano((obj as Record<string, unknown>)[key]))
  @IsBoolean({ message: 'O campo visivel_cliente deve ser verdadeiro ou falso.' })
  visivel_cliente?: boolean;
}
