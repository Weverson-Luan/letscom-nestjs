import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Feature } from 'src/shared/auth/features';
import { RequireFeatures } from 'src/shared/decorators/features.decorator';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { PaginationQueryDto } from 'src/shared/dto/pagination-query.dto';
import { ApiResponse } from 'src/shared/utils/api-response';
import { PAPEIS_CONVERSA_INTERNO } from '../conversas-clientes.constants';
import { BuscarConversaClienteService } from '../services/buscar-conversa-cliente.service';
import { ListarConversasClientesService } from '../services/listar-conversas-clientes.service';

/** Clientes com resumo de mensagens (total e último contato) para a tela do backoffice. */
@ApiTags('conversas-clientes')
@ApiBearerAuth()
@Controller('conversas-clientes')
@Roles(...PAPEIS_CONVERSA_INTERNO)
@RequireFeatures(Feature.VISUALIZAR_CONVERSA_CLIENTE)
export class ConversaClienteResumoController {
  constructor(
    private readonly listarClientes: ListarConversasClientesService,
    private readonly buscarCliente: BuscarConversaClienteService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista clientes com total de mensagens e data do último contato' })
  async listar(@Query() query: PaginationQueryDto) {
    const { data, pagination } = await this.listarClientes.execute(query);
    return ApiResponse.success('Clientes carregados com sucesso!', data, pagination);
  }

  @Get(':clienteId')
  @ApiParam({ name: 'clienteId', description: 'ID do cliente (users.id)' })
  @ApiOperation({ summary: 'Resumo de mensagens de um cliente' })
  async buscar(@Param('clienteId', ParseIntPipe) clienteId: number) {
    const data = await this.buscarCliente.execute(BigInt(clienteId));
    return ApiResponse.success('Cliente carregado com sucesso!', data);
  }
}
