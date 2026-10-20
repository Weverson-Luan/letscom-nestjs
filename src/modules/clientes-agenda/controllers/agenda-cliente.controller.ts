import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Feature } from 'src/shared/auth/features';
import { AuthUser, CurrentUser } from 'src/shared/decorators/current-user.decorator';
import { RequireFeatures } from 'src/shared/decorators/features.decorator';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { ApiResponse } from 'src/shared/utils/api-response';
import { PAPEIS_AGENDA_INTERNO } from '../clientes-agenda.constants';
import { AtualizarCompromissoClienteDto } from '../dto/atualizar-compromisso-cliente.dto';
import { CriarCompromissoClienteDto } from '../dto/criar-compromisso-cliente.dto';
import { ListarAgendaQueryDto } from '../dto/listar-agenda-query.dto';
import { ListarResponsaveisQueryDto } from '../dto/listar-responsaveis-query.dto';
import { AtualizarCompromissoClienteService } from '../services/atualizar-compromisso-cliente.service';
import { CriarCompromissoClienteService } from '../services/criar-compromisso-cliente.service';
import { ListarCompromissosClienteService } from '../services/listar-compromissos-cliente.service';
import { ListarResponsaveisCompromissoService } from '../services/listar-responsaveis-compromisso.service';
import { RemoverCompromissoClienteService } from '../services/remover-compromisso-cliente.service';

/** Agenda do cliente (ligações, reuniões, visitas...) mantida pela equipe no backoffice. */
@ApiTags('clientes-agenda')
@ApiBearerAuth()
@ApiParam({ name: 'clienteId', description: 'ID do cliente (users.id)' })
@Controller('clientes/:clienteId/agenda')
@Roles(...PAPEIS_AGENDA_INTERNO)
export class AgendaClienteController {
  constructor(
    private readonly listarCompromissos: ListarCompromissosClienteService,
    private readonly criarCompromisso: CriarCompromissoClienteService,
    private readonly atualizarCompromisso: AtualizarCompromissoClienteService,
    private readonly removerCompromisso: RemoverCompromissoClienteService,
    private readonly listarResponsaveisService: ListarResponsaveisCompromissoService,
  ) {}

  @Get()
  @RequireFeatures(Feature.VISUALIZAR_AGENDA_CLIENTE)
  @ApiOperation({ summary: 'Lista os compromissos do cliente (do mais próximo ao mais distante)' })
  async listar(
    @Param('clienteId', ParseIntPipe) clienteId: number,
    @Query() query: ListarAgendaQueryDto,
  ) {
    const { data, pagination } = await this.listarCompromissos.execute(BigInt(clienteId), query);
    return ApiResponse.success('Agenda carregada com sucesso!', data, pagination);
  }

  @Get('responsaveis')
  @RequireFeatures(Feature.GERENCIAR_AGENDA_CLIENTE)
  @ApiOperation({
    summary: 'Quem pode ser responsável: equipe interna, o cliente e os subordinados (paginado)',
  })
  async listarResponsaveis(
    @Param('clienteId', ParseIntPipe) clienteId: number,
    @Query() query: ListarResponsaveisQueryDto,
  ) {
    const { data, pagination } = await this.listarResponsaveisService.execute(
      BigInt(clienteId),
      query,
    );
    return ApiResponse.success('Responsáveis carregados com sucesso!', data, pagination);
  }

  @Post()
  @HttpCode(201)
  @RequireFeatures(Feature.GERENCIAR_AGENDA_CLIENTE)
  @ApiOperation({ summary: 'Cria um compromisso na agenda do cliente' })
  async criar(
    @Param('clienteId', ParseIntPipe) clienteId: number,
    @Body() body: CriarCompromissoClienteDto,
    @CurrentUser() usuario: AuthUser,
  ) {
    const data = await this.criarCompromisso.execute(BigInt(clienteId), body, usuario);
    return ApiResponse.success('Compromisso criado com sucesso!', data, null, 201);
  }

  @Put(':id')
  @RequireFeatures(Feature.GERENCIAR_AGENDA_CLIENTE)
  @ApiParam({ name: 'id', description: 'ID do compromisso' })
  @ApiOperation({ summary: 'Edita, conclui ou cancela um compromisso' })
  async atualizar(
    @Param('clienteId', ParseIntPipe) clienteId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: AtualizarCompromissoClienteDto,
  ) {
    const data = await this.atualizarCompromisso.execute(BigInt(clienteId), BigInt(id), body);
    return ApiResponse.success('Compromisso atualizado com sucesso!', data);
  }

  @Delete(':id')
  @RequireFeatures(Feature.GERENCIAR_AGENDA_CLIENTE)
  @ApiParam({ name: 'id', description: 'ID do compromisso' })
  @ApiOperation({ summary: 'Exclui o compromisso (exclusão lógica)' })
  async remover(
    @Param('clienteId', ParseIntPipe) clienteId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.removerCompromisso.execute(BigInt(clienteId), BigInt(id));
    return ApiResponse.success('Compromisso excluído com sucesso!', null);
  }
}
