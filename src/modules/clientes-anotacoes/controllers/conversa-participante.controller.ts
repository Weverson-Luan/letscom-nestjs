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
import { PAPEIS_ANOTACOES_CLIENTE } from '../clientes-anotacoes.constants';
import { ConvidarParticipanteConversaDto } from '../dto/convidar-participante-conversa.dto';
import { ListarCandidatosConviteQueryDto } from '../dto/listar-candidatos-convite-query.dto';
import { ConvidarParticipanteConversaService } from '../services/convidar-participante-conversa.service';
import { ListarCandidatosConviteConversaService } from '../services/listar-candidatos-convite-conversa.service';
import { ListarParticipantesConversaService } from '../services/listar-participantes-conversa.service';
import { RemoverParticipanteConversaService } from '../services/remover-participante-conversa.service';

/** Participantes da conversa do cliente vistos pela equipe (backoffice). */
@ApiTags('clientes-anotacoes')
@ApiBearerAuth()
@ApiParam({ name: 'clienteId', description: 'ID do cliente (users.id)' })
@Controller('clientes/:clienteId/conversa/participantes')
@Roles(...PAPEIS_ANOTACOES_CLIENTE)
export class ConversaParticipanteController {
  constructor(
    private readonly listarParticipantes: ListarParticipantesConversaService,
    private readonly listarCandidatos: ListarCandidatosConviteConversaService,
    private readonly convidarParticipante: ConvidarParticipanteConversaService,
    private readonly removerParticipante: RemoverParticipanteConversaService,
  ) {}

  @Get()
  @RequireFeatures(Feature.VISUALIZAR_ANOTACOES_CLIENTE)
  @ApiOperation({ summary: 'Estado da conversa, minha participação e participantes' })
  async listar(
    @Param('clienteId', ParseIntPipe) clienteId: number,
    @CurrentUser() usuario: AuthUser,
  ) {
    const data = await this.listarParticipantes.execute(BigInt(clienteId), usuario);
    return ApiResponse.success('Participantes carregados com sucesso!', data);
  }

  @Get('candidatos')
  @RequireFeatures(Feature.REGISTRAR_ANOTACOES_CLIENTE)
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
  @RequireFeatures(Feature.REGISTRAR_ANOTACOES_CLIENTE)
  @ApiOperation({ summary: 'Convida alguém para a conversa (só os donos)' })
  async convidar(
    @Param('clienteId', ParseIntPipe) clienteId: number,
    @Body() body: ConvidarParticipanteConversaDto,
    @CurrentUser() usuario: AuthUser,
  ) {
    const data = await this.convidarParticipante.execute(BigInt(clienteId), body, usuario);
    return ApiResponse.success('Convite enviado com sucesso!', data, null, 201);
  }

  @Delete(':participanteId')
  @RequireFeatures(Feature.REGISTRAR_ANOTACOES_CLIENTE)
  @ApiParam({ name: 'participanteId', description: 'ID do participante' })
  @ApiOperation({ summary: 'Remove um convidado ou cancela o convite (só os donos)' })
  async remover(
    @Param('clienteId', ParseIntPipe) clienteId: number,
    @Param('participanteId', ParseIntPipe) participanteId: number,
    @CurrentUser() usuario: AuthUser,
  ) {
    await this.removerParticipante.execute(BigInt(clienteId), BigInt(participanteId), usuario);
    return ApiResponse.success('Participante removido com sucesso!', null);
  }
}
