import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';
import { TAMANHO_MAXIMO_CONTEUDO } from '../conversas-clientes.constants';

/** Campos de texto do multipart. Os arquivos chegam no campo `anexos`. */
export class CriarMensagemConversaDto {
  @ApiPropertyOptional({
    example: 'Cliente pediu orçamento de 500 crachás PVC para novembro.',
    description: 'Obrigatório quando não houver anexo.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(TAMANHO_MAXIMO_CONTEUDO, {
    message: `A mensagem deve ter no máximo ${TAMANHO_MAXIMO_CONTEUDO} caracteres.`,
  })
  conteudo?: string;

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
