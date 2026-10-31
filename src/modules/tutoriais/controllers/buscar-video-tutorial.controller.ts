/**
 * IMPORTS
 */
import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

// shared
import { ALL_ROLES } from 'src/shared/constants/roles';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { ApiResponse } from 'src/shared/utils/api-response';

// services
import { BuscarVideoTutorialService } from '../services/buscar-video-tutorial.service';

@ApiTags('videos-tutorias')
@ApiBearerAuth()
@Controller('videos-tutorias')
export class BuscarVideoTutorialController {
  constructor(private readonly buscarVideoTutorialService: BuscarVideoTutorialService) {}

  @Get()
  @Roles(...ALL_ROLES)
  @ApiOperation({ summary: 'Retorna URL assinada do vídeo tutorial' })
  async buscar() {
    const video = await this.buscarVideoTutorialService.execute();
    return ApiResponse.success('URL do vídeo tutorial gerada com sucesso.', video);
  }
}
