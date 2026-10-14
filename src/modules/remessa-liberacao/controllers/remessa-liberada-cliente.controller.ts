import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Role } from 'src/shared/constants/roles';
import { AuthUser, CurrentUser } from 'src/shared/decorators/current-user.decorator';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { PaginationQueryDto } from 'src/shared/dto/pagination-query.dto';
import { ApiResponse } from 'src/shared/utils/api-response';
import { LiberarRemessaClienteDto } from '../dto/liberar-remessa-cliente.dto';
import { LiberarRemessasLoteDto } from '../dto/liberar-remessas-lote.dto';
import { UpdateRemessaLiberadaClienteDto } from '../dto/update-remessa-liberada-cliente.dto';
import { LiberarRemessasLoteClienteService } from '../services/liberar-remessas-lote-cliente.service';
import { RemessaLiberadaClienteService } from '../services/remessa-liberada-cliente.service';
import { Feature, FEATURES_LIBERACAO_RECEPCAO } from 'src/shared/auth/features';
import { RequireFeatures } from 'src/shared/decorators/features.decorator';

type MulterFile = { buffer: Buffer; originalname: string; mimetype?: string };

const ROLES_LEITURA = [Role.ADMIN, Role.PRODUCAO, Role.RECEPCAO] as const;
const ROLES_UPDATE = [Role.ADMIN, Role.PRODUCAO] as const;
const ROLES_LIBERACAO = [Role.ADMIN, Role.RECEPCAO] as const;

/**
 * Liberação de remessa para o cliente (recepção).
 * Prefixo Laravel: remessa-liberada-cliente
 */
@ApiTags('remessa-liberada-cliente')
@ApiBearerAuth()
@Controller('remessa-liberada-cliente')
export class RemessaLiberadaClienteController {
  constructor(
    private readonly service: RemessaLiberadaClienteService,
    private readonly loteService: LiberarRemessasLoteClienteService,
  ) {}

  @Post('lote')
  @RequireFeatures(Feature.LIBERACAO_MULTIPLAS_REMESSAS_RECEPCAO)
  @Roles(...ROLES_LIBERACAO)
  @ApiOperation({
    summary: 'Libera remessas em lote para o cliente (status → concluido)',
  })
  async liberarEmLote(@Body() dto: LiberarRemessasLoteDto, @CurrentUser() user: AuthUser) {
    const data = await this.loteService.liberarEmLote(dto, user);
    return ApiResponse.success('Remessas liberadas com sucesso!', data, null, 201);
  }

  @Get()
  @RequireFeatures(...FEATURES_LIBERACAO_RECEPCAO)
  @Roles(...ROLES_LEITURA)
  @ApiOperation({ summary: 'Lista liberações para cliente (paginado)' })
  async listar(@Query() query: PaginationQueryDto) {
    const { data, pagination } = await this.service.listarTodasLiberacoesPaginadas(
      query as unknown as Record<string, unknown>,
    );
    return ApiResponse.success('Remessas liberadas carregadas com sucesso!', data, pagination);
  }

  @Get(':id')
  @RequireFeatures(...FEATURES_LIBERACAO_RECEPCAO)
  @Roles(...ROLES_LEITURA)
  @ApiParam({ name: 'id', description: 'ID da liberação' })
  @ApiOperation({ summary: 'Busca liberação para cliente por id' })
  async porId(@Param('id') id: string) {
    const data = await this.service.listarPorId(BigInt(id));
    return ApiResponse.success('Liberação carregada com sucesso!', data);
  }

  @Post()
  @RequireFeatures(Feature.LIBERACAO_REMESSAS_RECEPCAO)
  @Roles(...ROLES_LIBERACAO)
  @ApiConsumes('multipart/form-data', 'application/json')
  @UseInterceptors(FileInterceptor('file_path'))
  @ApiOperation({
    summary: 'Libera uma remessa para o cliente (não altera status da remessa)',
  })
  async liberar(
    @Body() dto: LiberarRemessaClienteDto,
    @CurrentUser() user: AuthUser,
    @UploadedFile() file?: MulterFile,
  ) {
    if (file) {
      const ext = (file.originalname.split('.').pop() ?? '').toLowerCase();
      if (!['jpg', 'jpeg', 'png', 'pdf'].includes(ext)) {
        throw new BadRequestException('Arquivo inválido. Use jpg, jpeg, png ou pdf.');
      }
    }

    const data = await this.service.liberarRemessaParaCliente(dto, user, file);
    return ApiResponse.success('Remessa liberada com sucesso!', data, null, 201);
  }

  @Put(':id')
  @RequireFeatures(...FEATURES_LIBERACAO_RECEPCAO)
  @Roles(...ROLES_UPDATE)
  @ApiOperation({ summary: 'Atualiza liberação para cliente' })
  async atualizar(@Param('id') id: string, @Body() dto: UpdateRemessaLiberadaClienteDto) {
    const data = await this.service.atualizar(BigInt(id), dto);
    return ApiResponse.success('Liberação atualizada com sucesso!', data);
  }

  @Delete(':id')
  @RequireFeatures(Feature.EXCLUIR_REMESSAS)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Exclui liberação para cliente' })
  async excluir(@Param('id') id: string) {
    await this.service.excluir(BigInt(id));
    return ApiResponse.success('Remessa liberada excluída com sucesso!', null);
  }
}
