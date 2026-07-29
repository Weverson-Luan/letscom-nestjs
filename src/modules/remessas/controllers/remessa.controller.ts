import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Res,
  StreamableFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';
import { Role } from 'src/shared/constants/roles';
import { AuthUser, CurrentUser } from 'src/shared/decorators/current-user.decorator';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { PaginationQueryDto } from 'src/shared/dto/pagination-query.dto';
import { ApiResponse } from 'src/shared/utils/api-response';
import { SolicitarRemessaDto } from '../dto/solicitar-remessa.dto';
import { UpdateRemessaDto } from '../dto/update-remessa.dto';
import { RemessasResponseMapper } from '../mappers/remessas-response.mapper';
import { RemessaDownloadService } from '../services/remessa-download.service';
import { RemessaService } from '../services/remessa.service';
import { RemessasCacheService } from '../services/remessas-cache.service';
import { SolicitarRemessaUseCase } from '../use-cases/solicitar-remessa.use-case';

type MulterFile = { buffer: Buffer; originalname: string };

@ApiTags('remessas')
@ApiBearerAuth()
@Controller('remessas')
export class RemessaController {
  private readonly cacheTtl: number;

  constructor(
    private readonly service: RemessaService,
    private readonly solicitarUseCase: SolicitarRemessaUseCase,
    private readonly downloadService: RemessaDownloadService,
    private readonly mapper: RemessasResponseMapper,
    private readonly cache: RemessasCacheService,
    config: ConfigService,
  ) {
    this.cacheTtl = config.get<number>('remessas.cacheTtl') ?? 60;
  }

  // ---------------------------------------------------------------- CRIAÇÃO
  @Post()
  @Roles(Role.CLIENTE, Role.ADMIN, Role.SUBORDINADO)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'csv_file', maxCount: 1 },
      { name: 'zip_file', maxCount: 1 },
    ]),
  )
  @ApiOperation({ summary: 'Solicita uma remessa (com planilha e/ou ZIP de fotos)' })
  async solicitar(
    @Body() body: SolicitarRemessaDto,
    @UploadedFiles() files: { csv_file?: MulterFile[]; zip_file?: MulterFile[] },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { status, body: responseBody } = await this.solicitarUseCase.execute(
      body as unknown as Record<string, any>,
      files?.csv_file?.[0],
      files?.zip_file?.[0],
    );
    res.status(status);
    return responseBody;
  }

  // ---------------------------------------------------------------- LISTAGENS
  @Get()
  @Roles(
    Role.CLIENTE,
    Role.ADMIN,
    Role.PRODUCAO,
    Role.CONSULTOR,
    Role.EXPEDICAO,
    Role.RECEPCAO,
    Role.SUBORDINADO,
  )
  @ApiOperation({ summary: 'Lista remessas' })
  async index(@Query() query: PaginationQueryDto, @CurrentUser() user: AuthUser) {
    const { items, pagination } = await this.service.list(
      query as unknown as Record<string, unknown>,
      user,
    );
    return ApiResponse.success(
      'Remessas carregadas com sucessosss!',
      await this.mapper.mapRemessas(items),
      pagination,
    );
  }

  @Get('tarefas-disponiveis')
  @Roles(Role.ADMIN, Role.PRODUCAO, Role.CONSULTOR)
  @ApiOperation({ summary: 'Tarefas disponíveis para produção' })
  async tarefasDisponiveis(@Query() query: PaginationQueryDto) {
    const key = await this.cache.tarefasDisponiveisKey(query as any);
    const payload = await this.cache.remember(key, this.cacheTtl, async () => {
      const { items, pagination } = await this.service.listarDisponiveisParaProducao(
        query as unknown as Record<string, unknown>,
      );
      return { data: await this.mapper.mapRemessas(items), pagination };
    });
    return ApiResponse.success('Remessas disponíveis carregadas com sucesso!', payload.data, payload.pagination);
  }

  @Get('minhas-tarefas')
  @Roles(Role.ADMIN, Role.PRODUCAO, Role.CONSULTOR, Role.EXPEDICAO)
  @ApiOperation({ summary: 'Minhas tarefas (em produção)' })
  async minhasTarefas(@Query() query: PaginationQueryDto, @CurrentUser() user: AuthUser) {
    const key = await this.cache.minhasTarefasKey(Number(user.id), query as any);
    const payload = await this.cache.remember(key, this.cacheTtl, async () => {
      const { items, pagination } = await this.service.listarMinhasTarefas(
        query as unknown as Record<string, unknown>,
        user,
      );
      return { data: await this.mapper.mapRemessas(items), pagination };
    });
    return ApiResponse.success('Minhas remessas carregadas com sucesso!', payload.data, payload.pagination);
  }

  @Get('tarefas-expedicoes')
  @Roles(Role.ADMIN, Role.CONSULTOR, Role.EXPEDICAO)
  @ApiOperation({ summary: 'Tarefas em expedição' })
  async tarefasEmExpedicao(@Query() query: PaginationQueryDto, @CurrentUser() user: AuthUser) {
    const key = await this.cache.tarefasEmExpedicaoKey(Number(user.id), query as any);
    const payload = await this.cache.remember(key, this.cacheTtl, async () => {
      const { items, pagination } = await this.service.listarTarefasEmExpedicao(
        query as unknown as Record<string, unknown>,
        user,
      );
      return { data: await this.mapper.mapRemessas(items), pagination };
    });
    return ApiResponse.success('Minhas expedições carregadas com sucesso!', payload.data, payload.pagination);
  }

  @Get('tarefas-balcao')
  @Roles(Role.ADMIN, Role.CONSULTOR, Role.RECEPCAO, Role.EXPEDICAO)
  @ApiOperation({ summary: 'Tarefas de balcão' })
  async tarefasBalcao(@Query() query: PaginationQueryDto, @CurrentUser() user: AuthUser) {
    const key = await this.cache.tarefasBalcaoKey(Number(user.id), query as any);
    const payload = await this.cache.remember(key, this.cacheTtl, async () => {
      const { items, pagination } = await this.service.listarTarefasBalcao(
        query as unknown as Record<string, unknown>,
        user,
      );
      return { data: await this.mapper.mapRemessas(items), pagination };
    });
    return ApiResponse.success('Remessas balcão carregadas com sucesso!', payload.data, payload.pagination);
  }

  @Get('cliente/:clienteId/remessas-em-andamento')
  @Roles(Role.ADMIN, Role.PRODUCAO, Role.CONSULTOR, Role.CLIENTE, Role.SUBORDINADO)
  @ApiParam({ name: 'clienteId', description: 'ID do cliente' })
  @ApiOperation({ summary: 'Remessas em andamento por cliente' })
  async remessasEmAndamentoPorCliente(
    @Param('clienteId') clienteId: string,
    @Query() query: PaginationQueryDto,
  ) {
    const key = await this.cache.andamentoKey(Number(clienteId), query as any);
    const payload = await this.cache.remember(key, this.cacheTtl, async () => {
      const { items, pagination } = await this.service.listarRemessasEmAndamentoPorCliente(
        BigInt(clienteId),
        query as unknown as Record<string, unknown>,
      );
      return { data: await this.mapper.mapRemessas(items, true), pagination };
    });
    return ApiResponse.success('Remessas em andamento carregadas com sucesso!', payload.data, payload.pagination);
  }

  @Get('cliente/:clienteId/historico')
  @Roles(Role.ADMIN, Role.PRODUCAO, Role.CONSULTOR, Role.CLIENTE, Role.SUBORDINADO)
  @ApiParam({ name: 'clienteId', description: 'ID do cliente' })
  @ApiOperation({ summary: 'Histórico de remessas por cliente' })
  async remessasFinalizadasPorCliente(
    @Param('clienteId') clienteId: string,
    @Query() query: PaginationQueryDto,
  ) {
    const key = await this.cache.historicoKey(Number(clienteId), query as any);
    const payload = await this.cache.remember(key, this.cacheTtl, async () => {
      const { items, pagination } = await this.service.listarRemessasFinalizadasPorCliente(
        BigInt(clienteId),
        query as unknown as Record<string, unknown>,
      );
      return { data: await this.mapper.mapRemessas(items), pagination };
    });
    return ApiResponse.success('Histórico de remessas carregadas com sucesso!', payload.data, payload.pagination);
  }

  // ---------------------------------------------------------------- DOWNLOADS
  @Get(':id/fotos/download')
  @Roles(Role.ADMIN, Role.PRODUCAO, Role.CONSULTOR)
  @ApiParam({ name: 'id', description: 'ID da remessa' })
  @ApiOperation({ summary: 'Baixa as fotos da remessa (ZIP)' })
  async downloadFotos(@Param('id') id: string, @Res({ passthrough: true }) res: Response) {
    const result = await this.downloadService.downloadFotos(BigInt(id));
    res.set({
      'Content-Type': result.contentType,
      'Content-Disposition': `attachment; filename="${result.filename}"`,
      'Cache-Control': 'no-cache, must-revalidate',
    });
    return new StreamableFile(result.buffer);
  }

  @Get(':id/planilha/download')
  @Roles(Role.ADMIN, Role.PRODUCAO, Role.CONSULTOR)
  @ApiParam({ name: 'id', description: 'ID da remessa' })
  @ApiOperation({ summary: 'Baixa a planilha da remessa (com coluna remessa)' })
  async downloadPlanilha(@Param('id') id: string, @Res({ passthrough: true }) res: Response) {
    const result = await this.downloadService.downloadPlanilha(BigInt(id));
    res.set({
      'Content-Type': result.contentType,
      'Content-Disposition': `attachment; filename="${result.filename}"`,
      'Cache-Control': 'no-cache, must-revalidate',
    });
    return new StreamableFile(result.buffer);
  }

  // ---------------------------------------------------------------- SHOW/UPDATE/DELETE
  @Get(':id')
  @Roles(
    Role.ADMIN,
    Role.PRODUCAO,
    Role.CONSULTOR,
    Role.RECEPCAO,
    Role.EXPEDICAO,
    Role.CLIENTE,
    Role.SUBORDINADO,
  )
  @ApiParam({ name: 'id', description: 'ID da remessa' })
  @ApiOperation({ summary: 'Detalha uma remessa' })
  async show(@Param('id') id: string) {
    return this.service.findById(BigInt(id));
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.PRODUCAO, Role.CONSULTOR, Role.RECEPCAO, Role.EXPEDICAO)
  @ApiParam({ name: 'id', description: 'ID da remessa' })
  @ApiOperation({ summary: 'Atualiza uma remessa' })
  async updateRemessa(
    @Param('id') id: string,
    @Body() body: UpdateRemessaDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      await this.service.updateRemessa(BigInt(id), body as unknown as Record<string, any>);
      return {
        code: 200,
        status: 'success',
        message: 'Remessa atualizada com sucesso!',
        data: await this.service.findById(BigInt(id)),
        pagination: null,
      };
    } catch (error) {
      res.status(422);
      return {
        status: 422,
        message: 'Erro de regra de negócio',
        errors: { message: (error as Error).message },
      };
    }
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiParam({ name: 'id', description: 'ID da remessa' })
  @ApiOperation({ summary: 'Exclui (soft delete) uma remessa' })
  async destroy(@Param('id') id: string, @Res({ passthrough: true }) res: Response) {
    try {
      const success = await this.service.delete(BigInt(id));
      return { success };
    } catch (error) {
      res.status(500);
      return { error: (error as Error).message };
    }
  }
}
