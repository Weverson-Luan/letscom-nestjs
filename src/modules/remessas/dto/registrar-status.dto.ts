import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

const STATUS_VALIDOS = [
  'envio_de_dados',
  'em_producao',
  'conferido',
  'pedido_liberado',
  'concluido',
] as const;

export class RegistrarStatusDto {
  @ApiProperty({
    enum: STATUS_VALIDOS,
    example: 'em_producao',
    description: 'Novo status da remessa no fluxo',
  })
  @IsIn([...STATUS_VALIDOS], { message: 'O status informado é inválido.' })
  status!: (typeof STATUS_VALIDOS)[number];
}
