/**
 * IMPORTS
 */
import { Controller, Param, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

// shared
import { Feature } from 'src/shared/auth/features';
import { Role } from 'src/shared/constants/roles';
import { RequireFeatures } from 'src/shared/decorators/features.decorator';
import { Roles } from 'src/shared/decorators/roles.decorator';

// dto / services / mappers
import { EnviarFotosRemessaDto } from '../dto/enviar-fotos-remessa.dto';
import { EnviarFotosRemessaService } from '../services/enviar-fotos-remessa.service';
import { montarRespostaFotosEnviadas } from '../mappers/upload-remessa.mapper';

// typings
import { ArquivoEnviado } from '../uploads.types';

/** Rota Laravel: POST remessas/{id}/upload-fotos (RemessaFotoController). */
@ApiTags('uploads')
@ApiBearerAuth()
@Controller('remessas')
export class EnviarFotosRemessaController {
  constructor(private readonly enviarFotosRemessaService: EnviarFotosRemessaService) {}

  @Post(':remessaId/upload-fotos')
  @RequireFeatures(Feature.FINALIZAR_TAREFA_REMESSAS, Feature.MINHAS_TAREFA_REMESSAS)
  @Roles(Role.ADMIN, Role.PRODUCAO, Role.CONSULTOR)
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: EnviarFotosRemessaDto })
  @UseInterceptors(FileInterceptor('zip_file'))
  @ApiParam({ name: 'remessaId', description: 'ID da remessa' })
  @ApiOperation({ summary: 'Upload de fotos (ZIP) para a remessa' })
  async enviarFotosRemessa(
    @Param('remessaId') remessaId: string,
    @UploadedFile() arquivo?: ArquivoEnviado,
  ) {
    const caminhos = await this.enviarFotosRemessaService.execute(BigInt(remessaId), arquivo);
    return montarRespostaFotosEnviadas(caminhos);
  }
}
