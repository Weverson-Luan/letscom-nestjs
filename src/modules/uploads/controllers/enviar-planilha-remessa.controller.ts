/**
 * IMPORTS
 */
import { Body, Controller, Param, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
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
import { ApiResponse } from 'src/shared/utils/api-response';

// dto / services / mappers
import { EnviarPlanilhaRemessaDto } from '../dto/enviar-planilha-remessa.dto';
import { EnviarPlanilhaRemessaService } from '../services/enviar-planilha-remessa.service';
import { mapearPlanilhaRemessa } from '../mappers/upload-remessa.mapper';

// typings
import { ArquivoEnviado } from '../uploads.types';

/** Rota Laravel: POST remessas/{id}/upload-planilha (RemessaPlanilhaController). */
@ApiTags('uploads')
@ApiBearerAuth()
@Controller('remessas')
export class EnviarPlanilhaRemessaController {
  constructor(private readonly enviarPlanilhaRemessaService: EnviarPlanilhaRemessaService) {}

  @Post(':remessaId/upload-planilha')
  @RequireFeatures(Feature.FINALIZAR_TAREFA_REMESSAS, Feature.MINHAS_TAREFA_REMESSAS)
  @Roles(Role.ADMIN, Role.PRODUCAO, Role.CONSULTOR)
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: EnviarPlanilhaRemessaDto })
  @UseInterceptors(FileInterceptor('file'))
  @ApiParam({ name: 'remessaId', description: 'ID da remessa' })
  @ApiOperation({ summary: 'Upload de planilha para a remessa' })
  async enviarPlanilhaRemessa(
    @Param('remessaId') remessaId: string,
    @Body() body: EnviarPlanilhaRemessaDto,
    @UploadedFile() arquivo?: ArquivoEnviado,
  ) {
    const planilha = await this.enviarPlanilhaRemessaService.execute(
      BigInt(remessaId),
      arquivo,
      body?.tipo,
    );
    return ApiResponse.success('Planilha enviada com sucesso!', mapearPlanilhaRemessa(planilha));
  }
}
