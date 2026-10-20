import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Feature } from 'src/shared/auth/features';
import { AuthUser, CurrentUser } from 'src/shared/decorators/current-user.decorator';
import { RequireFeatures } from 'src/shared/decorators/features.decorator';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { ApiResponse } from 'src/shared/utils/api-response';
import { PAPEIS_CONVERSA_INTERNO } from '../conversas-clientes.constants';
import { ConvidarParticipanteConversaDto } from '../dto/convidar-participante-conversa.dto';
import { ListarCandidatosConviteQueryDto } from '../dto/listar-candidatos-convite-query.dto';
import { ConvidarParticipanteConversaService } from '../services/convidar-participante-conversa.service';
import { ListarCandidatosConviteConversaService } from '../services/listar-candidatos-convite-conversa.service';
import { ListarParticipantesConversaService } from '../services/listar-participantes-conversa.service';
import { InativarParticipanteConversaService } from '../services/inativar-participante-conversa.service';
import { ReativarParticipanteConversaService } from '../services/reativar-participante-conversa.service';
import { RemoverParticipanteConversaService } from '../services/remover-participante-conversa.service';

/** Participantes da conversa do cliente vistos pela equipe (backoffice). */
@ApiTags('conversas-clientes')
@ApiBearerAuth()
@ApiParam({ name: 'clienteId', description: 'ID do cliente (users.id)' })
@Controller('clientes/:clienteId/conversa/participantes')
@Roles(...PAPEIS_CONVERSA_INTERNO)
export class ConversaParticipanteController {
  constructor(
    private readonly listarParticipantes: ListarParticipantesConversaService,
    private readonly listarCandidatos: ListarCandidatosConviteConversaService,
    private readonly convidarParticipante: ConvidarParticipanteConversaService,
    private readonly removerParticipante: RemoverParticipanteConversaService,
    private readonly inativarParticipante: InativarParticipanteConversaService,
    private readonly reativarParticipante: ReativarParticipanteConversaService,
  ) {}

  @Get()
  @RequireFeatures(Feature.VISUALIZAR_CONVERSA_CLIENTE)
  @ApiOperation({ summary: 'Estado da conversa, minha participação e participantes' })
  async listar(
    @Param('clienteId', ParseIntPipe) clienteId: number,
    @CurrentUser() usuario: AuthUser,
  ) {
    const data = await this.listarParticipantes.execute(BigInt(clienteId), usuario);
    return ApiResponse.success('Participantes carregados com sucesso!', data);
  }

  @Get('candidatos')
  @RequireFeatures(Feature.ENVIAR_MENSAGENS_CONVERSA_CLIENTE)
  @ApiOperation({ summary: 'Pessoas que o dono da conversa pode convidar' })
  async candidatos(
    @Param('clienteId', ParseIntPipe) clienteId: number,
    @Query() query: ListarCandidatosConviteQueryDto,
    @CurrentUser() usuario: AuthUser,
  ) {
    const data = await this.listarCandidatos.execute(BigInt(clienteId), query.search, usuario);
    return ApiResponse.success('Candidatos carregados com sucesso!', data);
  }

  @Post()
  @HttpCode(201)
  @RequireFeatures(Feature.ENVIAR_MENSAGENS_CONVERSA_CLIENTE)
  @ApiOperation({ summary: 'Convida alguém para a conversa (só os donos)' })
  async convidar(
    @Param('clienteId', ParseIntPipe) clienteId: number,
    @Body() body: ConvidarParticipanteConversaDto,
    @CurrentUser() usuario: AuthUser,
  ) {
    const data = await this.convidarParticipante.execute(BigInt(clienteId), body, usuario);
    return ApiResponse.success('Convite enviado com sucesso!', data, null, 201);
  }

  @Post(':participanteId/inativar')
  @HttpCode(200)
  @RequireFeatures(Feature.ENVIAR_MENSAGENS_CONVERSA_CLIENTE)
  @ApiParam({ name: 'participanteId', description: 'ID do participante' })
  @ApiOperation({ summary: 'Desativa o acesso de um participante à conversa (só os donos)' })
  async inativar(
    @Param('clienteId', ParseIntPipe) clienteId: number,
    @Param('participanteId', ParseIntPipe) participanteId: number,
    @CurrentUser() usuario: AuthUser,
  ) {
    const data = await this.inativarParticipante.execute(
      BigInt(clienteId),
      BigInt(participanteId),
      usuario,
    );
    return ApiResponse.success('Acesso do participante inativado.', data);
  }

  @Post(':participanteId/reativar')
  @HttpCode(200)
  @RequireFeatures(Feature.ENVIAR_MENSAGENS_CONVERSA_CLIENTE)
  @ApiParam({ name: 'participanteId', description: 'ID do participante' })
  @ApiOperation({ summary: 'Reativa o acesso de um participante inativado (só os donos)' })
  async reativar(
    @Param('clienteId', ParseIntPipe) clienteId: number,
    @Param('participanteId', ParseIntPipe) participanteId: number,
    @CurrentUser() usuario: AuthUser,
  ) {
    const data = await this.reativarParticipante.execute(
      BigInt(clienteId),
      BigInt(participanteId),
      usuario,
    );
    return ApiResponse.success('Acesso do participante reativado.', data);
  }

  @Delete(':participanteId')
  @RequireFeatures(Feature.ENVIAR_MENSAGENS_CONVERSA_CLIENTE)
  @ApiParam({ name: 'participanteId', description: 'ID do participante' })
  @ApiOperation({ summary: 'Cancela um convite pendente ou recusado (só os donos)' })
  async remover(
    @Param('clienteId', ParseIntPipe) clienteId: number,
    @Param('participanteId', ParseIntPipe) participanteId: number,
    @CurrentUser() usuario: AuthUser,
  ) {
    await this.removerParticipante.execute(BigInt(clienteId), BigInt(participanteId), usuario);
    return ApiResponse.success('Participante removido com sucesso!', null);
  }
}
