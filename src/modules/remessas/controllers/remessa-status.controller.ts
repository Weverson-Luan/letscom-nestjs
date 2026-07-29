import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { RemessaStatusEtapa } from '@prisma/client';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from 'src/shared/constants/roles';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { ApiResponse } from 'src/shared/utils/api-response';
import { RegistrarStatusDto } from '../dto/registrar-status.dto';
import { RemessaStatusService } from '../services/remessa-status.service';

const STATUS_VALIDOS: RemessaStatusEtapa[] = [
  'envio_de_dados',
  'em_producao',
  'conferido',
  'pedido_liberado',
  'concluido',
] as RemessaStatusEtapa[];

@ApiTags('remessas')
@ApiBearerAuth()
@Controller('remessas/:remessaId/status')
export class RemessaStatusController {
  constructor(private readonly service: RemessaStatusService) {}

  @Post()
  @Roles(
    Role.ADMIN,
    Role.PRODUCAO,
    Role.CONSULTOR,
    Role.CLIENTE,
    Role.SUBORDINADO,
    Role.RECEPCAO,
    Role.EXPEDICAO,
  )
  @ApiParam({ name: 'remessaId', description: 'ID da remessa' })
  @ApiOperation({ summary: 'Registra uma mudança de status da remessa' })
  async registrar(
    @Param('remessaId') remessaId: string,
    @Body() body: RegistrarStatusDto,
  ) {
    if (!STATUS_VALIDOS.includes(body.status as RemessaStatusEtapa)) {
      throw new HttpException(
        {
          message: 'The given data was invalid.',
          errors: { status: ['O status informado é inválido.'] },
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    await this.service.registrarStatus(
      BigInt(remessaId),
      body.status as RemessaStatusEtapa,
    );
    return { message: 'Status registrado com sucesso.' };
  }

  @Get()
  @Roles(
    Role.ADMIN,
    Role.PRODUCAO,
    Role.CONSULTOR,
    Role.CLIENTE,
    Role.SUBORDINADO,
    Role.RECEPCAO,
    Role.EXPEDICAO,
  )
  @ApiParam({ name: 'remessaId', description: 'ID da remessa' })
  @ApiOperation({ summary: 'Histórico de status da remessa' })
  async historico(@Param('remessaId') remessaId: string) {
    const status = await this.service.listarHistorico(BigInt(remessaId));
    return ApiResponse.success('Status da remessa!', status);
  }
}
