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
  StreamableFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Feature } from 'src/shared/auth/features';
import { AuthUser, CurrentUser } from 'src/shared/decorators/current-user.decorator';
import { RequireFeatures } from 'src/shared/decorators/features.decorator';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { ApiResponse } from 'src/shared/utils/api-response';
import {
  ArquivoAnexo,
  MAXIMO_ANEXOS_POR_ANOTACAO,
  PAPEIS_ANOTACOES_CLIENTE,
  TAMANHO_MAXIMO_ANEXO_BYTES,
} from '../clientes-anotacoes.constants';
import { AtualizarAnotacaoClienteDto } from '../dto/atualizar-anotacao-cliente.dto';
import { CriarAnotacaoClienteDto } from '../dto/criar-anotacao-cliente.dto';
import { ListarAnotacoesClienteQueryDto } from '../dto/listar-anotacoes-cliente-query.dto';
import { AtualizarAnotacaoClienteService } from '../services/atualizar-anotacao-cliente.service';
import { BaixarAnexoAnotacaoClienteService } from '../services/baixar-anexo-anotacao-cliente.service';
import { CriarAnotacaoClienteService } from '../services/criar-anotacao-cliente.service';
import { ListarAnotacoesClienteService } from '../services/listar-anotacoes-cliente.service';
import { RemoverAnotacaoClienteService } from '../services/remover-anotacao-cliente.service';

/**
 * Linha do tempo de anotações do cliente (conversas, ligações, negociações...) usada pelo
 * backoffice no lugar do CRM externo. Anexos ficam no storage e são baixados pela API.
 */
@ApiTags('clientes-anotacoes')
@ApiBearerAuth()
@ApiParam({ name: 'clienteId', description: 'ID do cliente (users.id)' })
@Controller('clientes/:clienteId/anotacoes')
@Roles(...PAPEIS_ANOTACOES_CLIENTE)
export class ClienteAnotacaoController {
  constructor(
    private readonly listarAnotacoes: ListarAnotacoesClienteService,
    private readonly criarAnotacao: CriarAnotacaoClienteService,
    private readonly atualizarAnotacao: AtualizarAnotacaoClienteService,
    private readonly removerAnotacao: RemoverAnotacaoClienteService,
    private readonly baixarAnexo: BaixarAnexoAnotacaoClienteService,
  ) {}

  @Get()
  @RequireFeatures(Feature.VISUALIZAR_ANOTACOES_CLIENTE)
  @ApiOperation({ summary: 'Lista as anotações do cliente (mais recentes primeiro)' })
  async listar(
    @Param('clienteId', ParseIntPipe) clienteId: number,
    @Query() query: ListarAnotacoesClienteQueryDto,
    @CurrentUser() usuario: AuthUser,
  ) {
    const { data, pagination } = await this.listarAnotacoes.execute(
      BigInt(clienteId),
      query,
      usuario,
    );
    return ApiResponse.success('Anotações carregadas com sucesso!', data, pagination);
  }

  @Post()
  @HttpCode(201)
  @RequireFeatures(Feature.REGISTRAR_ANOTACOES_CLIENTE)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FilesInterceptor('anexos', MAXIMO_ANEXOS_POR_ANOTACAO, {
      limits: { fileSize: TAMANHO_MAXIMO_ANEXO_BYTES },
    }),
  )
  @ApiOperation({ summary: 'Registra uma anotação com anexos opcionais' })
  async criar(
    @Param('clienteId', ParseIntPipe) clienteId: number,
    @Body() body: CriarAnotacaoClienteDto,
    @CurrentUser() usuario: AuthUser,
    @UploadedFiles() arquivos?: ArquivoAnexo[],
  ) {
    const data = await this.criarAnotacao.execute(BigInt(clienteId), body, arquivos ?? [], usuario);
    return ApiResponse.success('Anotação registrada com sucesso!', data, null, 201);
  }

  @Put(':id')
  @RequireFeatures(Feature.REGISTRAR_ANOTACOES_CLIENTE)
  @ApiParam({ name: 'id', description: 'ID da anotação' })
  @ApiOperation({ summary: 'Edita a própria anotação' })
  async atualizar(
    @Param('clienteId', ParseIntPipe) clienteId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: AtualizarAnotacaoClienteDto,
    @CurrentUser() usuario: AuthUser,
  ) {
    const data = await this.atualizarAnotacao.execute(BigInt(clienteId), BigInt(id), body, usuario);
    return ApiResponse.success('Anotação atualizada com sucesso!', data);
  }

  @Delete(':id')
  @RequireFeatures(Feature.REGISTRAR_ANOTACOES_CLIENTE)
  @ApiParam({ name: 'id', description: 'ID da anotação' })
  @ApiOperation({ summary: 'Exclui a anotação (autor ou admin)' })
  async remover(
    @Param('clienteId', ParseIntPipe) clienteId: number,
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() usuario: AuthUser,
  ) {
    await this.removerAnotacao.execute(BigInt(clienteId), BigInt(id), usuario);
    return ApiResponse.success('Anotação excluída com sucesso!', null);
  }

  @Get(':id/anexos/:anexoId')
  @RequireFeatures(Feature.VISUALIZAR_ANOTACOES_CLIENTE)
  @ApiParam({ name: 'id', description: 'ID da anotação' })
  @ApiParam({ name: 'anexoId', description: 'ID do anexo' })
  @ApiOperation({ summary: 'Baixa um anexo da anotação' })
  async baixar(
    @Param('clienteId', ParseIntPipe) clienteId: number,
    @Param('id', ParseIntPipe) id: number,
    @Param('anexoId', ParseIntPipe) anexoId: number,
    @CurrentUser() usuario: AuthUser,
  ) {
    const { conteudo, disposicao, mimeType } = await this.baixarAnexo.execute(
      BigInt(clienteId),
      BigInt(id),
      BigInt(anexoId),
      usuario,
    );
    return new StreamableFile(conteudo, {
      type: mimeType,
      disposition: disposicao,
      length: conteudo.length,
    });
  }
}
