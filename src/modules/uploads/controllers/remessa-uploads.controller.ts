import {
  BadRequestException,
  Body,
  Controller,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from 'src/shared/constants/roles';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { ApiResponse } from 'src/shared/utils/api-response';
import { UploadFotosRemessaDto, UploadPlanilhaRemessaDto } from '../dto/upload-remessa.dto';
import { RemessaUploadService } from '../services/remessa-upload.service';
import { Feature } from 'src/shared/auth/features';
import { RequireFeatures } from 'src/shared/decorators/features.decorator';

type MulterFile = { buffer: Buffer; originalname: string; mimetype?: string };

/**
 * Uploads dedicados de remessa — espelha RemessaFotoController / RemessaPlanilhaController.
 * Rotas Laravel: POST remessas/{id}/upload-fotos|upload-planilha
 */
@ApiTags('uploads')
@ApiBearerAuth()
@Controller('remessas')
export class RemessaUploadsController {
  constructor(private readonly uploadService: RemessaUploadService) {}

  @Post(':remessaId/upload-fotos')
  @RequireFeatures(Feature.FINALIZAR_TAREFA_REMESSAS, Feature.MINHAS_TAREFA_REMESSAS)
  @Roles(Role.ADMIN, Role.PRODUCAO, Role.CONSULTOR)
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadFotosRemessaDto })
  @UseInterceptors(FileInterceptor('zip_file'))
  @ApiParam({ name: 'remessaId', description: 'ID da remessa' })
  @ApiOperation({ summary: 'Upload de fotos (ZIP) para a remessa' })
  async uploadFotos(@Param('remessaId') remessaId: string, @UploadedFile() file?: MulterFile) {
    if (!file) {
      throw new BadRequestException('O campo zip_file é obrigatório.');
    }
    const files = await this.uploadService.processZipFotos(BigInt(remessaId), file);
    return {
      code: 200,
      message: 'Fotos extraídas e salvas com sucesso.',
      files,
    };
  }

  @Post(':remessaId/upload-planilha')
  @RequireFeatures(Feature.FINALIZAR_TAREFA_REMESSAS, Feature.MINHAS_TAREFA_REMESSAS)
  @Roles(Role.ADMIN, Role.PRODUCAO, Role.CONSULTOR)
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadPlanilhaRemessaDto })
  @UseInterceptors(FileInterceptor('file'))
  @ApiParam({ name: 'remessaId', description: 'ID da remessa' })
  @ApiOperation({ summary: 'Upload de planilha para a remessa' })
  async uploadPlanilha(
    @Param('remessaId') remessaId: string,
    @UploadedFile() file?: MulterFile,
    @Body() body?: UploadPlanilhaRemessaDto,
  ) {
    if (!file) {
      throw new BadRequestException('O campo file é obrigatório.');
    }
    const planilha = await this.uploadService.uploadPlanilha(BigInt(remessaId), file, body?.tipo);
    return ApiResponse.success('Planilha enviada com sucesso!', {
      id: planilha.id,
      remessa_id: planilha.remessaId,
      cliente_id: planilha.clienteId,
      file_path: planilha.filePath,
      tipo: planilha.tipo,
      created_at: planilha.createdAt,
    });
  }
}
