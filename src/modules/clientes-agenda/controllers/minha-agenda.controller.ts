import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Feature } from 'src/shared/auth/features';
import { AuthUser, CurrentUser } from 'src/shared/decorators/current-user.decorator';
import { RequireFeatures } from 'src/shared/decorators/features.decorator';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { ApiResponse } from 'src/shared/utils/api-response';
import { PAPEIS_AGENDA_CLIENTE } from '../clientes-agenda.constants';
import { ListarAgendaQueryDto } from '../dto/listar-agenda-query.dto';
import { ListarMinhaAgendaService } from '../services/listar-minha-agenda.service';

/** Agenda vista pelo cliente (principal e subordinados), somente leitura. A empresa vem do token. */
@ApiTags('clientes-agenda')
@ApiBearerAuth()
@Controller('minha-agenda')
@Roles(...PAPEIS_AGENDA_CLIENTE)
@RequireFeatures(Feature.ACESSAR_AGENDA_CLIENTE)
export class MinhaAgendaController {
  constructor(private readonly listarMinhaAgenda: ListarMinhaAgendaService) {}

  @Get()
  @ApiOperation({ summary: 'Compromissos visíveis ao cliente da empresa do usuário logado' })
  async listar(@Query() query: ListarAgendaQueryDto, @CurrentUser() usuario: AuthUser) {
    const { data, pagination } = await this.listarMinhaAgenda.execute(query, usuario);
    return ApiResponse.success('Agenda carregada com sucesso!', data, pagination);
  }
}
