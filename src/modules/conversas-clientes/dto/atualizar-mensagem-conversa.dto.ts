import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { TAMANHO_MAXIMO_CONTEUDO } from '../conversas-clientes.constants';

export class AtualizarMensagemConversaDto {
  @ApiPropertyOptional({ example: 'Orçamento enviado por e-mail.' })
  @IsOptional()
  @IsString()
  @MaxLength(TAMANHO_MAXIMO_CONTEUDO, {
    message: `A mensagem deve ter no máximo ${TAMANHO_MAXIMO_CONTEUDO} caracteres.`,
  })
  conteudo?: string;
}
