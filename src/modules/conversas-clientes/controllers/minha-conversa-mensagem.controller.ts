import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
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
  PAPEIS_CLIENTE_ANOTACOES,
  TAMANHO_MAXIMO_ANEXO_BYTES,
} from '../clientes-anotacoes.constants';
import { ListarAnotacoesClienteQueryDto } from '../dto/listar-anotacoes-cliente-query.dto';
import { ResponderAnotacoesClienteDto } from '../dto/responder-anotacoes-cliente.dto';
import { BaixarAnexoMinhaAnotacaoService } from '../services/baixar-anexo-minha-anotacao.service';
import { ListarMinhasAnotacoesService } from '../services/listar-minhas-anotacoes.service';
import { ResponderAnotacoesClienteService } from '../services/responder-anotacoes-cliente.service';

/**
 * Conversa vista pelo lado do cliente (cliente principal e subordinados) no portal do cliente.
 * A empresa vem do token — nunca da URL.
 */
@ApiTags('clientes-anotacoes')
@ApiBearerAuth()
@Controller('minhas-anotacoes')
@Roles(...PAPEIS_CLIENTE_ANOTACOES)
@RequireFeatures(Feature.RESPONDER_ANOTACOES_CLIENTE)
export class MinhaAnotacaoController {
  constructor(
    private readonly listarMinhasAnotacoes: ListarMinhasAnotacoesService,
    private readonly responderAnotacoes: ResponderAnotacoesClienteService,
    private readonly baixarAnexo: BaixarAnexoMinhaAnotacaoService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Histórico de anotações da empresa do cliente logado' })
  async listar(@Query() query: ListarAnotacoesClienteQueryDto, @CurrentUser() usuario: AuthUser) {
    const { data, pagination } = await this.listarMinhasAnotacoes.execute(query, usuario);
    return ApiResponse.success('Anotações carregadas com sucesso!', data, pagination);
  }

  @Post()
  @HttpCode(201)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FilesInterceptor('anexos', MAXIMO_ANEXOS_POR_ANOTACAO, {
      limits: { fileSize: TAMANHO_MAXIMO_ANEXO_BYTES },
    }),
  )
  @ApiOperation({ summary: 'Cliente responde na conversa (texto e/ou anexos)' })
  async responder(
    @Body() body: ResponderAnotacoesClienteDto,
    @CurrentUser() usuario: AuthUser,
    @UploadedFiles() arquivos?: ArquivoAnexo[],
  ) {
    const data = await this.responderAnotacoes.execute(body, arquivos ?? [], usuario);
    return ApiResponse.success('Mensagem enviada com sucesso!', data, null, 201);
  }

  @Get(':id/anexos/:anexoId')
  @ApiParam({ name: 'id', description: 'ID da anotação' })
  @ApiParam({ name: 'anexoId', description: 'ID do anexo' })
  @ApiOperation({ summary: 'Baixa um anexo da conversa' })
  async baixar(
    @Param('id', ParseIntPipe) id: number,
    @Param('anexoId', ParseIntPipe) anexoId: number,
    @CurrentUser() usuario: AuthUser,
  ) {
    const { conteudo, disposicao, mimeType } = await this.baixarAnexo.execute(
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
