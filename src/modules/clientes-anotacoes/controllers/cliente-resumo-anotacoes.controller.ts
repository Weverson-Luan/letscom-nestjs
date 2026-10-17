import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Feature } from 'src/shared/auth/features';
import { RequireFeatures } from 'src/shared/decorators/features.decorator';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { PaginationQueryDto } from 'src/shared/dto/pagination-query.dto';
import { ApiResponse } from 'src/shared/utils/api-response';
import { PAPEIS_ANOTACOES_CLIENTE } from '../clientes-anotacoes.constants';
import { BuscarClienteAnotacoesService } from '../services/buscar-cliente-anotacoes.service';
import { ListarClientesAnotacoesService } from '../services/listar-clientes-anotacoes.service';

/** Clientes com resumo de anotações (total e último contato) para a tela do backoffice. */
@ApiTags('clientes-anotacoes')
@ApiBearerAuth()
@Controller('clientes-anotacoes')
@Roles(...PAPEIS_ANOTACOES_CLIENTE)
@RequireFeatures(Feature.VISUALIZAR_ANOTACOES_CLIENTE)
export class ClienteResumoAnotacoesController {
  constructor(
    private readonly listarClientes: ListarClientesAnotacoesService,
    private readonly buscarCliente: BuscarClienteAnotacoesService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista clientes com total de anotações e data do último contato' })
  async listar(@Query() query: PaginationQueryDto) {
    const { data, pagination } = await this.listarClientes.execute(query);
    return ApiResponse.success('Clientes carregados com sucesso!', data, pagination);
  }

  @Get(':clienteId')
  @ApiParam({ name: 'clienteId', description: 'ID do cliente (users.id)' })
  @ApiOperation({ summary: 'Resumo de anotações de um cliente' })
  async buscar(@Param('clienteId', ParseIntPipe) clienteId: number) {
    const data = await this.buscarCliente.execute(BigInt(clienteId));
    return ApiResponse.success('Cliente carregado com sucesso!', data);
  }
}
