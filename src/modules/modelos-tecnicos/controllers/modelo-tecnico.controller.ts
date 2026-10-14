import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Role } from 'src/shared/constants/roles';
import { AuthUser, CurrentUser } from 'src/shared/decorators/current-user.decorator';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { PaginationQueryDto } from 'src/shared/dto/pagination-query.dto';
import { ApiResponse } from 'src/shared/utils/api-response';
import { filterVarBoolean } from 'src/shared/utils/boolean-filter';
import { ModelosPorClienteQueryDto } from '../dto/modelos-por-cliente-query.dto';
import { CreateModeloTecnicoDto } from '../dto/create-modelo-tecnico.dto';
import { UpdateModeloTecnicoDto } from '../dto/update-modelo-tecnico.dto';
import { ModeloTecnicoMapper } from '../mappers/modelo-tecnico.mapper';
import { ModeloTecnicoService } from '../services/modelo-tecnico.service';
import { Feature, FEATURES_LIBERACAO } from 'src/shared/auth/features';
import { RequireFeatures } from 'src/shared/decorators/features.decorator';

type MulterFile = { buffer: Buffer; originalname: string; mimetype?: string };

const ROLES_LISTA = [
  Role.ADMIN,
  Role.PRODUCAO,
  Role.CONSULTOR,
  Role.CLIENTE,
  Role.RECEPCAO,
  Role.SUBORDINADO,
] as const;

const ROLES_LISTA_COM_EXPEDICAO = [...ROLES_LISTA, Role.EXPEDICAO] as const;

const ROLES_ESCRITA = [Role.ADMIN, Role.PRODUCAO, Role.CLIENTE] as const;

/**
 * Apenas admin, produção e consultor enxergam modelos inativos (para poder
 * reativá-los); o dashboard do cliente continua listando só os ativos.
 */
const ROLES_GERENCIAM_INATIVOS: string[] = [Role.ADMIN, Role.PRODUCAO, Role.CONSULTOR];
const ROLES_UPDATE = [Role.ADMIN, Role.PRODUCAO, Role.CONSULTOR, Role.CLIENTE] as const;

@ApiTags('modelo-tecnico')
@ApiBearerAuth()
@Controller('modelo-tecnico')
export class ModeloTecnicoController {
  constructor(
    private readonly service: ModeloTecnicoService,
    private readonly mapper: ModeloTecnicoMapper,
  ) {}

  @Get()
  @RequireFeatures(Feature.VISUALIZAR_MODELOS_TECNICOS)
  @Roles(...ROLES_LISTA)
  @ApiOperation({ summary: 'Lista modelos técnicos (paginado)' })
  async index(@Query() query: PaginationQueryDto) {
    const { data, pagination } = await this.service.listar(
      query as unknown as Record<string, unknown>,
    );
    return ApiResponse.success('Modelos carregados com sucesso!', data, pagination);
  }

  @Get('clientes/:id')
  @RequireFeatures(Feature.VISUALIZAR_MODELOS_TECNICOS)
  @Roles(...ROLES_LISTA_COM_EXPEDICAO)
  @ApiParam({ name: 'id', description: 'ID do cliente' })
  @ApiOperation({ summary: 'Lista modelos técnicos de um cliente' })
  async porCliente(
    @Param('id') id: string,
    @Query() query: ModelosPorClienteQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    const incluirInativos =
      filterVarBoolean(query.incluir_inativos) &&
      user.roles.some((role) => ROLES_GERENCIAM_INATIVOS.includes(role));

    const { data, pagination } = await this.service.listar(
      query as unknown as Record<string, unknown>,
      BigInt(id),
      incluirInativos,
    );
    return ApiResponse.success('Modelos carregados com sucesso!', data, pagination);
  }

  @Get('cliente/unico/:id')
  @RequireFeatures(
    Feature.VISUALIZAR_MODELOS_TECNICOS,
    Feature.PESQUISAR_REMESSAS,
    Feature.PEGAR_TAREFA_REMESSAS,
    Feature.MINHAS_TAREFA_REMESSAS,
    ...FEATURES_LIBERACAO,
  )
  @Roles(...ROLES_LISTA_COM_EXPEDICAO)
  @ApiOperation({ summary: 'Detalha um modelo técnico (com URLs e contagens)' })
  async unico(@Param('id') id: string) {
    const data = await this.service.buscarUnico(BigInt(id));
    return ApiResponse.success('Modelo técnico encontrado com sucesso.', data);
  }

  @Get(':id/imagem/:lado')
  @RequireFeatures(
    Feature.VISUALIZAR_MODELOS_TECNICOS,
    Feature.PESQUISAR_REMESSAS,
    Feature.PEGAR_TAREFA_REMESSAS,
    Feature.MINHAS_TAREFA_REMESSAS,
    ...FEATURES_LIBERACAO,
  )
  @Roles(...ROLES_LISTA_COM_EXPEDICAO)
  @ApiParam({ name: 'id', description: 'ID do modelo' })
  @ApiParam({ name: 'lado', description: 'frente ou verso' })
  @ApiOperation({ summary: 'Retorna URL assinada da imagem do modelo' })
  async imagem(@Param('id') id: string, @Param('lado') lado: string) {
    return this.service.obterUrlImagem(BigInt(id), lado);
  }

  @Post()
  @RequireFeatures(Feature.CRIAR_MODELOS_TECNICOS)
  @Roles(...ROLES_ESCRITA)
  @HttpCode(201)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'foto_frente', maxCount: 1 },
      { name: 'foto_verso', maxCount: 1 },
    ]),
  )
  @ApiOperation({ summary: 'Cria um modelo técnico (fotos obrigatórias)' })
  async store(
    @Body() body: CreateModeloTecnicoDto,
    @UploadedFiles()
    files: { foto_frente?: MulterFile[]; foto_verso?: MulterFile[] },
  ) {
    const modelo = await this.service.criar(body, files?.foto_frente?.[0], files?.foto_verso?.[0]);
    return ApiResponse.success(
      'Modelo criado com sucesso!',
      await this.mapper.mapOne(modelo),
      null,
      201,
    );
  }

  @Get(':id')
  @RequireFeatures(Feature.VISUALIZAR_MODELOS_TECNICOS)
  @Roles(...ROLES_LISTA_COM_EXPEDICAO)
  @ApiOperation({ summary: 'Exibe um modelo técnico' })
  async show(@Param('id') id: string) {
    const modelo = await this.service.buscar(BigInt(id));
    return ApiResponse.success('Modelo encontrado com sucesso.', await this.mapper.mapOne(modelo));
  }

  @Post(':id')
  @RequireFeatures(Feature.EDITAR_MODELOS_TECNICOS)
  @Roles(...ROLES_UPDATE)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'foto_frente', maxCount: 1 },
      { name: 'foto_verso', maxCount: 1 },
    ]),
  )
  @ApiOperation({ summary: 'Atualiza um modelo técnico (multipart)' })
  async update(
    @Param('id') id: string,
    @Body() body: UpdateModeloTecnicoDto,
    @UploadedFiles()
    files: { foto_frente?: MulterFile[]; foto_verso?: MulterFile[] },
  ) {
    const modelo = await this.service.atualizar(
      BigInt(id),
      body,
      files?.foto_frente?.[0],
      files?.foto_verso?.[0],
    );
    return ApiResponse.success('Modelo atualizado com sucesso.', await this.mapper.mapOne(modelo));
  }

  @Patch(':id/inativar')
  @RequireFeatures(Feature.INATIVAR_MODELOS_TECNICOS)
  @Roles(...ROLES_UPDATE)
  @ApiOperation({ summary: 'Inativa um modelo técnico (preserva histórico)' })
  async inativar(@Param('id') id: string) {
    await this.service.inativar(BigInt(id));
    return ApiResponse.success('Modelo inativado com sucesso.', null);
  }

  @Patch(':id/reativar')
  @RequireFeatures(Feature.INATIVAR_MODELOS_TECNICOS)
  @Roles(Role.ADMIN, Role.PRODUCAO, Role.CONSULTOR)
  @ApiOperation({ summary: 'Reativa um modelo técnico inativado' })
  async reativar(@Param('id') id: string) {
    await this.service.reativar(BigInt(id));
    return ApiResponse.success('Modelo reativado com sucesso.', null);
  }
}
