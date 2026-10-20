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
  MAXIMO_ANEXOS_POR_MENSAGEM,
  PAPEIS_CONVERSA_INTERNO,
  TAMANHO_MAXIMO_ANEXO_BYTES,
} from '../conversas-clientes.constants';
import { AtualizarMensagemConversaDto } from '../dto/atualizar-mensagem-conversa.dto';
import { CriarMensagemConversaDto } from '../dto/criar-mensagem-conversa.dto';
import { PaginationQueryDto } from 'src/shared/dto/pagination-query.dto';
import { AtualizarMensagemConversaService } from '../services/atualizar-mensagem-conversa.service';
import { BaixarAnexoMensagemConversaService } from '../services/baixar-anexo-mensagem-conversa.service';
import { CriarMensagemConversaService } from '../services/criar-mensagem-conversa.service';
import { ListarMensagensConversaService } from '../services/listar-mensagens-conversa.service';
import { RemoverMensagemConversaService } from '../services/remover-mensagem-conversa.service';

/**
 * Mensagens da conversa (chat) entre a equipe e a empresa do cliente, vistas pelo backoffice.
 * Compromissos (ligações, reuniões...) ficam na agenda. Anexos ficam no storage e são baixados pela API.
 */
@ApiTags('conversas-clientes')
@ApiBearerAuth()
@ApiParam({ name: 'clienteId', description: 'ID do cliente (users.id)' })
@Controller('clientes/:clienteId/conversa/mensagens')
@Roles(...PAPEIS_CONVERSA_INTERNO)
export class ConversaMensagemController {
  constructor(
    private readonly listarMensagens: ListarMensagensConversaService,
    private readonly criarMensagem: CriarMensagemConversaService,
    private readonly atualizarMensagem: AtualizarMensagemConversaService,
    private readonly removerMensagem: RemoverMensagemConversaService,
    private readonly baixarAnexo: BaixarAnexoMensagemConversaService,
  ) {}

  @Get()
  @RequireFeatures(Feature.VISUALIZAR_CONVERSA_CLIENTE)
  @ApiOperation({ summary: 'Lista as mensagens do cliente (mais recentes primeiro)' })
  async listar(
    @Param('clienteId', ParseIntPipe) clienteId: number,
    @Query() query: PaginationQueryDto,
    @CurrentUser() usuario: AuthUser,
  ) {
    const { data, pagination } = await this.listarMensagens.execute(
      BigInt(clienteId),
      query,
      usuario,
    );
    return ApiResponse.success('Mensagens carregadas com sucesso!', data, pagination);
  }

  @Post()
  @HttpCode(201)
  @RequireFeatures(Feature.ENVIAR_MENSAGENS_CONVERSA_CLIENTE)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FilesInterceptor('anexos', MAXIMO_ANEXOS_POR_MENSAGEM, {
      limits: { fileSize: TAMANHO_MAXIMO_ANEXO_BYTES },
    }),
  )
  @ApiOperation({ summary: 'Registra uma mensagem com anexos opcionais' })
  async criar(
    @Param('clienteId', ParseIntPipe) clienteId: number,
    @Body() body: CriarMensagemConversaDto,
    @CurrentUser() usuario: AuthUser,
    @UploadedFiles() arquivos?: ArquivoAnexo[],
  ) {
    const data = await this.criarMensagem.execute(BigInt(clienteId), body, arquivos ?? [], usuario);
    return ApiResponse.success('Mensagem registrada com sucesso!', data, null, 201);
  }

  @Put(':id')
  @RequireFeatures(Feature.ENVIAR_MENSAGENS_CONVERSA_CLIENTE)
  @ApiParam({ name: 'id', description: 'ID da mensagem' })
  @ApiOperation({ summary: 'Edita a própria mensagem' })
  async atualizar(
    @Param('clienteId', ParseIntPipe) clienteId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: AtualizarMensagemConversaDto,
    @CurrentUser() usuario: AuthUser,
  ) {
    const data = await this.atualizarMensagem.execute(BigInt(clienteId), BigInt(id), body, usuario);
    return ApiResponse.success('Mensagem atualizada com sucesso!', data);
  }

  @Delete(':id')
  @RequireFeatures(Feature.ENVIAR_MENSAGENS_CONVERSA_CLIENTE)
  @ApiParam({ name: 'id', description: 'ID da mensagem' })
  @ApiOperation({ summary: 'Exclui a mensagem (autor ou admin)' })
  async remover(
    @Param('clienteId', ParseIntPipe) clienteId: number,
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() usuario: AuthUser,
  ) {
    await this.removerMensagem.execute(BigInt(clienteId), BigInt(id), usuario);
    return ApiResponse.success('Mensagem excluída com sucesso!', null);
  }

  @Get(':id/anexos/:anexoId')
  @RequireFeatures(Feature.VISUALIZAR_CONVERSA_CLIENTE)
  @ApiParam({ name: 'id', description: 'ID da mensagem' })
  @ApiParam({ name: 'anexoId', description: 'ID do anexo' })
  @ApiOperation({ summary: 'Baixa um anexo da mensagem' })
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
