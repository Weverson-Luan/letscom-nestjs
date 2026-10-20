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
import { PAPEIS_CLIENTE_ANOTACOES } from '../clientes-anotacoes.constants';
import { ConvidarParticipanteConversaDto } from '../dto/convidar-participante-conversa.dto';
import { ListarCandidatosConviteQueryDto } from '../dto/listar-candidatos-convite-query.dto';
import { ConvidarParticipanteConversaService } from '../services/convidar-participante-conversa.service';
import { exigirClienteIdDoUsuario } from '../services/helpers/resolver-usuario-anotacao.helper';
import { ListarCandidatosConviteConversaService } from '../services/listar-candidatos-convite-conversa.service';
import { ListarParticipantesConversaService } from '../services/listar-participantes-conversa.service';
import { RemoverParticipanteConversaService } from '../services/remover-participante-conversa.service';

/** Participantes da conversa vistos pelo lado do cliente. A empresa vem do token — nunca da URL. */
@ApiTags('clientes-anotacoes')
@ApiBearerAuth()
@Controller('minhas-anotacoes/participantes')
@Roles(...PAPEIS_CLIENTE_ANOTACOES)
@RequireFeatures(Feature.RESPONDER_ANOTACOES_CLIENTE)
export class MinhaConversaParticipanteController {
  constructor(
    private readonly listarParticipantes: ListarParticipantesConversaService,
    private readonly listarCandidatos: ListarCandidatosConviteConversaService,
    private readonly convidarParticipante: ConvidarParticipanteConversaService,
    private readonly removerParticipante: RemoverParticipanteConversaService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Estado da conversa, minha participação e participantes' })
  async listar(@CurrentUser() usuario: AuthUser) {
    const data = await this.listarParticipantes.execute(exigirClienteIdDoUsuario(usuario), usuario);
    return ApiResponse.success('Participantes carregados com sucesso!', data);
  }

  @Get('candidatos')
  @ApiOperation({ summary: 'Pessoas da empresa que o dono da conversa pode convidar' })
  async candidatos(
    @Query() query: ListarCandidatosConviteQueryDto,
    @CurrentUser() usuario: AuthUser,
  ) {
    const data = await this.listarCandidatos.execute(
      exigirClienteIdDoUsuario(usuario),
      query.search,
      usuario,
    );
    return ApiResponse.success('Candidatos carregados com sucesso!', data);
  }

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Convida alguém da empresa para a conversa (só o dono)' })
  async convidar(@Body() body: ConvidarParticipanteConversaDto, @CurrentUser() usuario: AuthUser) {
    const data = await this.convidarParticipante.execute(
      exigirClienteIdDoUsuario(usuario),
      body,
      usuario,
    );
    return ApiResponse.success('Convite enviado com sucesso!', data, null, 201);
  }

  @Delete(':participanteId')
  @ApiParam({ name: 'participanteId', description: 'ID do participante' })
  @ApiOperation({ summary: 'Remove um convidado da empresa ou cancela o convite (só o dono)' })
  async remover(
    @Param('participanteId', ParseIntPipe) participanteId: number,
    @CurrentUser() usuario: AuthUser,
  ) {
    await this.removerParticipante.execute(
      exigirClienteIdDoUsuario(usuario),
      BigInt(participanteId),
      usuario,
    );
    return ApiResponse.success('Participante removido com sucesso!', null);
  }
}
