import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ClienteAnotacaoTipo } from '@prisma/client';
import { IsIn, IsInt, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';
import { TAMANHO_MAXIMO_CONTEUDO, TIPOS_ANOTACAO } from '../clientes-anotacoes.constants';

/** Campos de texto do multipart. Os arquivos chegam no campo `anexos`. */
export class CriarAnotacaoClienteDto {
  @ApiPropertyOptional({
    example: 'Cliente pediu orçamento de 500 crachás PVC para novembro.',
    description: 'Obrigatório quando não houver anexo.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(TAMANHO_MAXIMO_CONTEUDO, {
    message: `A anotação deve ter no máximo ${TAMANHO_MAXIMO_CONTEUDO} caracteres.`,
  })
  conteudo?: string;

  @ApiPropertyOptional({ enum: TIPOS_ANOTACAO, default: 'nota' })
  @IsOptional()
  @IsIn(TIPOS_ANOTACAO, { message: 'Tipo de anotação inválido.' })
  tipo?: ClienteAnotacaoTipo;

  @ApiPropertyOptional({
    example: 3,
    description:
      'Só ao iniciar a conversa: subordinado (users_cliente.id) com quem conversar. ' +
      'Sem ele, a conversa é iniciada com o cliente principal. Ignorado depois de iniciada.',
  })
  @IsOptional()
  @IsInt({ message: 'Subordinado inválido.' })
  @IsPositive({ message: 'Subordinado inválido.' })
  subordinado_id?: number;

  @ApiProperty({
    type: 'array',
    items: { type: 'string', format: 'binary' },
    required: false,
    description: 'Até 5 arquivos de 10 MB.',
  })
  anexos?: unknown;
}
