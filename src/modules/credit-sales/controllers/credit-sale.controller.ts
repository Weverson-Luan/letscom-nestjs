import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from 'src/shared/constants/roles';
import { AuthUser, CurrentUser } from 'src/shared/decorators/current-user.decorator';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { ApiResponse } from 'src/shared/utils/api-response';
import { CreateCreditSaleDto } from '../dto/create-credit-sale.dto';
import { CreditoClienteQueryDto, CreditSaleListQueryDto } from '../dto/list-credit-sale-query.dto';
import { UpdateCreditSaleDto } from '../dto/update-credit-sale.dto';
import { mapCreditSale } from '../mappers/credit-sale.mapper';
import { CreditSaleService } from '../services/credit-sale.service';
import { CreditoClienteExtratoService } from '../services/credito-cliente-extrato.service';
import { Feature } from 'src/shared/auth/features';
import { RequireFeatures } from 'src/shared/decorators/features.decorator';

const ROLES_LEITURA = [
  Role.ADMIN,
  Role.PRODUCAO,
  Role.CONSULTOR,
  Role.CLIENTE,
  Role.SUBORDINADO,
] as const;

const ROLES_ESCRITA = [Role.ADMIN, Role.PRODUCAO, Role.CONSULTOR] as const;

@ApiTags('vendas_creditos')
@ApiBearerAuth()
@Controller('vendas_creditos')
export class CreditSaleController {
  constructor(
    private readonly service: CreditSaleService,
    private readonly extratoService: CreditoClienteExtratoService,
  ) {}

  @Get()
  @RequireFeatures(Feature.GERENCIAR_CREDITOS_CLIENTE, Feature.VISUALIZAR_EXTRATO_CREDITO)
  @Roles(...ROLES_LEITURA)
  @ApiOperation({ summary: 'Lista vendas de créditos (paginado)' })
  async index(@Query() query: CreditSaleListQueryDto) {
    const { data, pagination } = await this.service.listar(
      query as unknown as Record<string, unknown>,
    );
    return ApiResponse.success(
      'Histórico de transações carregadas com sucesso!',
      data,
      pagination,
    );
  }

  @Get('cliente/:id')
  @RequireFeatures(Feature.GERENCIAR_CREDITOS_CLIENTE, Feature.VISUALIZAR_EXTRATO_CREDITO)
  @Roles(...ROLES_LEITURA)
  @ApiParam({ name: 'id', description: 'ID do cliente' })
  @ApiOperation({ summary: 'Lista transações de um cliente' })
  async porCliente(
    @Param('id') id: string,
    @Query() query: CreditSaleListQueryDto,
  ) {
    const { data, pagination } = await this.service.listarPorCliente(
      BigInt(id),
      query as unknown as Record<string, unknown>,
    );
    return ApiResponse.success(
      'Histórico de transações carregadas com sucessos!',
      data,
      pagination,
    );
  }

  @Get('cliente/:clienteId/creditos')
  @RequireFeatures(Feature.VISUALIZAR_SALDO_CREDITOS, Feature.GERENCIAR_CREDITOS_CLIENTE)
  @Roles(...ROLES_LEITURA)
  @ApiParam({ name: 'clienteId', description: 'ID do cliente' })
  @ApiQuery({
    name: 'format',
    required: false,
    example: 'list',
    description: 'Formato da resposta (ex.: list)',
  })
  @ApiOperation({ summary: 'Saldo consolidado de créditos por cliente' })
  async saldo(
    @Param('clienteId') clienteId: string,
    @Query('format') format?: string,
  ) {
    const data = await this.service.saldoPorCliente(
      BigInt(clienteId),
      format ?? 'list',
    );
    return ApiResponse.success('Créditos consolidados por tipo.', data);
  }

  @Get('cliente/:clienteId/extrato')
  @RequireFeatures(Feature.VISUALIZAR_EXTRATO_CREDITO)
  @Roles(...ROLES_LEITURA)
  @ApiParam({ name: 'clienteId', description: 'ID do cliente' })
  @ApiOperation({ summary: 'Extrato de movimentações de crédito do cliente' })
  async extrato(
    @Param('clienteId') clienteId: string,
    @Query() query: CreditoClienteQueryDto,
  ) {
    const { data, pagination } = await this.extratoService.listarPorCliente(
      BigInt(clienteId),
      query as unknown as Record<string, unknown>,
    );
    return ApiResponse.success(
      'Extrato de movimentações de crédito carregado com sucesso.',
      data,
      pagination,
    );
  }

  @Get('cliente/:clienteId/cobranca')
  @RequireFeatures(Feature.VISUALIZAR_COBRANCA_CREDITO)
  @Roles(Role.ADMIN, Role.CONSULTOR)
  @ApiParam({ name: 'clienteId', description: 'ID do cliente' })
  @ApiOperation({ summary: 'Cobrança faturável de créditos do cliente' })
  async cobranca(
    @Param('clienteId') clienteId: string,
    @Query() query: CreditoClienteQueryDto,
  ) {
    const { data, pagination, totais, totais_por_produto } =
      await this.extratoService.listarCobranca(
        BigInt(clienteId),
        query as unknown as Record<string, unknown>,
      );
    return {
      ...ApiResponse.success(
        'Cobrança de créditos carregada com sucesso.',
        data,
        pagination,
      ),
      totais,
      totais_por_produto,
    };
  }

  @Post()
  @RequireFeatures(Feature.CRIAR_CREDITO, Feature.GERENCIAR_CREDITOS_CLIENTE)
  @Roles(...ROLES_ESCRITA)
  @HttpCode(201)
  @ApiOperation({ summary: 'Cria uma venda de créditos' })
  async store(
    @Body() body: CreateCreditSaleDto,
    @CurrentUser() user: AuthUser,
  ) {
    const sale = await this.service.criar(body, user);
    return {
      code: 200,
      message: 'Venda criada com sucesso!',
      data: mapCreditSale(sale),
    };
  }

  @Post(':id/cancelar')
  @RequireFeatures(Feature.GERENCIAR_CREDITOS_CLIENTE)
  @Roles(...ROLES_ESCRITA)
  @ApiParam({ name: 'id', description: 'ID da venda' })
  @ApiOperation({ summary: 'Cancela uma venda de créditos' })
  async cancelar(@Param('id') id: string) {
    await this.service.cancelar(BigInt(id));
    return ApiResponse.success('Venda cancelada com sucesso', []);
  }

  @Get(':id')
  @RequireFeatures(Feature.GERENCIAR_CREDITOS_CLIENTE, Feature.VISUALIZAR_EXTRATO_CREDITO)
  @Roles(Role.ADMIN, Role.PRODUCAO, Role.CONSULTOR, Role.CLIENTE)
  @ApiParam({ name: 'id', description: 'ID da venda' })
  @ApiOperation({ summary: 'Detalha uma venda de créditos' })
  async show(@Param('id') id: string) {
    const sale = await this.service.buscar(BigInt(id));
    return ApiResponse.success(
      'Venda carregada com sucesso!',
      mapCreditSale(sale),
    );
  }

  @Put(':id')
  @RequireFeatures(Feature.GERENCIAR_CREDITOS_CLIENTE)
  @Roles(...ROLES_ESCRITA)
  @ApiParam({ name: 'id', description: 'ID da venda' })
  @ApiOperation({ summary: 'Atualiza uma venda de créditos (não confirmada)' })
  async update(@Param('id') id: string, @Body() body: UpdateCreditSaleDto) {
    await this.service.atualizar(BigInt(id), body);
    return { success: true };
  }

  @Delete(':id')
  @RequireFeatures(Feature.GERENCIAR_CREDITOS_CLIENTE)
  @Roles(...ROLES_ESCRITA)
  @ApiParam({ name: 'id', description: 'ID da venda' })
  @ApiOperation({ summary: 'Exclui (soft delete) uma venda não confirmada' })
  async destroy(@Param('id') id: string) {
    await this.service.excluir(BigInt(id));
    return { success: true };
  }
}
