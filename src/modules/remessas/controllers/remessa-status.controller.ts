import {
  Body,
  Controller,
  ForbiddenException,
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
import { FeatureGateService } from 'src/shared/auth/feature-gate.service';
import { Feature, MENSAGEM_SEM_PERMISSAO } from 'src/shared/auth/features';
import { featuresExigidasParaStatus } from 'src/shared/auth/remessa-acao-features';
import { Role } from 'src/shared/constants/roles';
import { AuthUser, CurrentUser } from 'src/shared/decorators/current-user.decorator';
import { RequireFeatures } from 'src/shared/decorators/features.decorator';
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
  constructor(
    private readonly service: RemessaStatusService,
    private readonly featureGate: FeatureGateService,
  ) {}

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
    @CurrentUser() user: AuthUser,
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

    // o status registrado no histórico sempre acompanha uma ação do PUT /remessas/:id
    if (!(await this.featureGate.permite(user, featuresExigidasParaStatus(body.status)))) {
      throw new ForbiddenException(MENSAGEM_SEM_PERMISSAO);
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
  @RequireFeatures(
    Feature.PESQUISAR_REMESSAS,
    Feature.VISUALIZAR_REMESSAS_ANDAMENTO,
    Feature.VISUALIZAR_HISTORICO_REMESSAS,
  )
  @ApiOperation({ summary: 'Histórico de status da remessa' })
  async historico(@Param('remessaId') remessaId: string) {
    const status = await this.service.listarHistorico(BigInt(remessaId));
    return ApiResponse.success('Status da remessa!', status);
  }
}
