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
  MAXIMO_ANEXOS_POR_MENSAGEM,
  PAPEIS_CONVERSA_CLIENTE,
  TAMANHO_MAXIMO_ANEXO_BYTES,
} from '../conversas-clientes.constants';
import { PaginationQueryDto } from 'src/shared/dto/pagination-query.dto';
import { ResponderConversaClienteDto } from '../dto/responder-conversa-cliente.dto';
import { BaixarAnexoMinhaConversaService } from '../services/baixar-anexo-minha-conversa.service';
import { ListarMinhasMensagensConversaService } from '../services/listar-minhas-mensagens-conversa.service';
import { ResponderConversaClienteService } from '../services/responder-conversa-cliente.service';

/**
 * Conversa vista pelo lado do cliente (cliente principal e subordinados) no portal do cliente.
 * A empresa vem do token — nunca da URL.
 */
@ApiTags('conversas-clientes')
@ApiBearerAuth()
@Controller('minha-conversa/mensagens')
@Roles(...PAPEIS_CONVERSA_CLIENTE)
@RequireFeatures(Feature.RESPONDER_CONVERSA_CLIENTE)
export class MinhaConversaMensagemController {
  constructor(
    private readonly listarMinhasMensagens: ListarMinhasMensagensConversaService,
    private readonly responderConversa: ResponderConversaClienteService,
    private readonly baixarAnexo: BaixarAnexoMinhaConversaService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Histórico de mensagens da empresa do cliente logado' })
  async listar(@Query() query: PaginationQueryDto, @CurrentUser() usuario: AuthUser) {
    const { data, pagination } = await this.listarMinhasMensagens.execute(query, usuario);
    return ApiResponse.success('Mensagens carregadas com sucesso!', data, pagination);
  }

  @Post()
  @HttpCode(201)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FilesInterceptor('anexos', MAXIMO_ANEXOS_POR_MENSAGEM, {
      limits: { fileSize: TAMANHO_MAXIMO_ANEXO_BYTES },
    }),
  )
  @ApiOperation({ summary: 'Cliente responde na conversa (texto e/ou anexos)' })
  async responder(
    @Body() body: ResponderConversaClienteDto,
    @CurrentUser() usuario: AuthUser,
    @UploadedFiles() arquivos?: ArquivoAnexo[],
  ) {
    const data = await this.responderConversa.execute(body, arquivos ?? [], usuario);
    return ApiResponse.success('Mensagem enviada com sucesso!', data, null, 201);
  }

  @Get(':id/anexos/:anexoId')
  @ApiParam({ name: 'id', description: 'ID da mensagem' })
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
