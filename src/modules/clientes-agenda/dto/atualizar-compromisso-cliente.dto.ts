import { ApiPropertyOptional } from '@nestjs/swagger';
import { ClienteCompromissoStatus, ClienteCompromissoTipo } from '@prisma/client';
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
  ValidateIf,
} from 'class-validator';
import { normalizarBooleano } from 'src/shared/utils/boolean-filter';
import { TAMANHO_MAXIMO_DESCRICAO, TAMANHO_MAXIMO_TITULO } from '../clientes-agenda.constants';
import { aparar, foiInformado } from './transformacoes-compromisso.helper';

/**
 * Todos os campos opcionais (ausente = não muda). Só `descricao`, `responsavel_id` e
 * `responsavel_subordinado_id` aceitam null (null limpa; informar um responsável limpa o outro;
 * `descricao` ""/null limpa); nos demais, null é validado e vira 400 (são colunas NOT NULL).
 */
export class AtualizarCompromissoClienteDto {
  @ApiPropertyOptional({ example: 'Apresentar proposta', maxLength: TAMANHO_MAXIMO_TITULO })
  @ValidateIf(foiInformado)
  @Transform(aparar)
  @IsString({ message: 'O título deve ser um texto.' })
  @IsNotEmpty({ message: 'O título não pode ficar vazio.' })
  @MaxLength(TAMANHO_MAXIMO_TITULO, {
    message: `O título deve ter no máximo ${TAMANHO_MAXIMO_TITULO} caracteres.`,
  })
  titulo?: string;

  @ApiPropertyOptional({ enum: ClienteCompromissoTipo })
  @ValidateIf(foiInformado)
  @IsEnum(ClienteCompromissoTipo, { message: 'Tipo de compromisso inválido.' })
  tipo?: ClienteCompromissoTipo;

  @ApiPropertyOptional({
    example: 'Levar amostras PVC',
    maxLength: TAMANHO_MAXIMO_DESCRICAO,
    nullable: true,
    description: '"" ou null limpa a descrição',
  })
  @IsOptional()
  @IsString({ message: 'A descrição deve ser um texto.' })
  @MaxLength(TAMANHO_MAXIMO_DESCRICAO, {
    message: `A descrição deve ter no máximo ${TAMANHO_MAXIMO_DESCRICAO} caracteres.`,
  })
  descricao?: string | null;

  @ApiPropertyOptional({ example: '2026-10-21T14:00:00.000Z', description: 'Data/hora ISO 8601' })
  @ValidateIf(foiInformado)
  @IsISO8601({ strict: true }, { message: 'Informe a data do compromisso no formato ISO 8601.' })
  agendado_para?: string;

  @ApiPropertyOptional({
    example: 8,
    nullable: true,
    description: 'users.id de um usuário interno ativo ou do próprio cliente; null remove',
  })
  @IsOptional()
  @IsInt({ message: 'Responsável inválido.' })
  @IsPositive({ message: 'Responsável inválido.' })
  responsavel_id?: number | null;

  @ApiPropertyOptional({
    example: 3,
    nullable: true,
    description: 'users_cliente.id de um subordinado ativo do cliente; null remove',
  })
  @IsOptional()
  @IsInt({ message: 'Responsável inválido.' })
  @IsPositive({ message: 'Responsável inválido.' })
  responsavel_subordinado_id?: number | null;

  @ApiPropertyOptional({ example: true })
  @ValidateIf(foiInformado)
  @Transform(({ obj, key }) => normalizarBooleano((obj as Record<string, unknown>)[key]))
  @IsBoolean({ message: 'O campo visivel_cliente deve ser verdadeiro ou falso.' })
  visivel_cliente?: boolean;

  @ApiPropertyOptional({ enum: ClienteCompromissoStatus })
  @ValidateIf(foiInformado)
  @IsEnum(ClienteCompromissoStatus, { message: 'Status de compromisso inválido.' })
  status?: ClienteCompromissoStatus;
}
