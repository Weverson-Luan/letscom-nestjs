import { ApiPropertyOptional } from '@nestjs/swagger';
import { ClienteCompromissoStatus, ClienteCompromissoTipo } from '@prisma/client';
import { IsEnum, IsISO8601, IsOptional } from 'class-validator';
import { PaginationQueryDto } from 'src/shared/dto/pagination-query.dto';

/** Query de listagem da agenda (interna e /minha-agenda); `search` (título/descrição) vem da base. */
export class ListarAgendaQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ClienteCompromissoStatus })
  @IsOptional()
  @IsEnum(ClienteCompromissoStatus, { message: 'Status de compromisso inválido.' })
  status?: ClienteCompromissoStatus;

  @ApiPropertyOptional({ enum: ClienteCompromissoTipo })
  @IsOptional()
  @IsEnum(ClienteCompromissoTipo, { message: 'Tipo de compromisso inválido.' })
  tipo?: ClienteCompromissoTipo;

  @ApiPropertyOptional({
    example: '2026-10-01',
    description: 'ISO 8601 (data ou data/hora): agendado_para >= de',
  })
  @IsOptional()
  @IsISO8601({ strict: true }, { message: 'O filtro "de" deve estar no formato ISO 8601.' })
  de?: string;

  @ApiPropertyOptional({
    example: '2026-10-31',
    description:
      'ISO 8601 (data ou data/hora): agendado_para <= ate. Só data = até o fim do dia (UTC).',
  })
  @IsOptional()
  @IsISO8601({ strict: true }, { message: 'O filtro "ate" deve estar no formato ISO 8601.' })
  ate?: string;
}
