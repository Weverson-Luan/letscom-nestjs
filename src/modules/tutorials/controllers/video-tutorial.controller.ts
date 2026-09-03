import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ALL_ROLES } from 'src/shared/constants/roles';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { ApiResponse } from 'src/shared/utils/api-response';
import { VideoTutorialService } from '../services/video-tutorial.service';

@ApiTags('videos-tutorias')
@ApiBearerAuth()
@Roles(...ALL_ROLES)
@Controller('videos-tutorias')
export class VideoTutorialController {
  constructor(private readonly service: VideoTutorialService) {}

  @Get()
  @ApiOperation({ summary: 'Retorna URL assinada do vídeo tutorial' })
  async show() {
    const video = await this.service.obterUrl();
    return ApiResponse.success(
      'URL do vídeo tutorial gerada com sucesso.',
      video,
    );
  }
}
