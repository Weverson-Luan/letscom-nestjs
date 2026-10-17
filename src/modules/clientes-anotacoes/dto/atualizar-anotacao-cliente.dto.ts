import { ApiPropertyOptional } from '@nestjs/swagger';
import { ClienteAnotacaoTipo } from '@prisma/client';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { TAMANHO_MAXIMO_CONTEUDO, TIPOS_ANOTACAO } from '../clientes-anotacoes.constants';

export class AtualizarAnotacaoClienteDto {
  @ApiPropertyOptional({ example: 'Orçamento enviado por e-mail.' })
  @IsOptional()
  @IsString()
  @MaxLength(TAMANHO_MAXIMO_CONTEUDO, {
    message: `A anotação deve ter no máximo ${TAMANHO_MAXIMO_CONTEUDO} caracteres.`,
  })
  conteudo?: string;

  @ApiPropertyOptional({ enum: TIPOS_ANOTACAO })
  @IsOptional()
  @IsIn(TIPOS_ANOTACAO, { message: 'Tipo de anotação inválido.' })
  tipo?: ClienteAnotacaoTipo;
}
