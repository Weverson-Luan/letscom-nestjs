import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { TAMANHO_MAXIMO_CONTEUDO } from '../clientes-anotacoes.constants';

/** Resposta do cliente: só texto e anexos (o tipo é sempre `nota`). */
export class ResponderAnotacoesClienteDto {
  @ApiPropertyOptional({ example: 'Pode seguir com o orçamento, aprovado.' })
  @IsOptional()
  @IsString()
  @MaxLength(TAMANHO_MAXIMO_CONTEUDO, {
    message: `A mensagem deve ter no máximo ${TAMANHO_MAXIMO_CONTEUDO} caracteres.`,
  })
  conteudo?: string;

  @ApiProperty({
    type: 'array',
    items: { type: 'string', format: 'binary' },
    required: false,
    description: 'Até 5 arquivos de 10 MB.',
  })
  anexos?: unknown;
}
