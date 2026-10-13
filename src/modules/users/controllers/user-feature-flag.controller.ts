import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from 'src/shared/decorators/current-user.decorator';
import { ApiResponse } from 'src/shared/utils/api-response';
import { mapEnabledKeys } from '../mappers/feature-flags.mapper';
import { UserFeatureFlagService } from '../services/user-feature-flag.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UserFeatureFlagController {
  constructor(private readonly service: UserFeatureFlagService) {}

  @Get('dados/feature-flags')
  @ApiOperation({ summary: 'Feature flags habilitadas do usuário autenticado' })
  async minhas(@CurrentUser() user: AuthUser) {
    const keys = await this.service.listarHabilitadasDoUsuarioAutenticado(user);
    return ApiResponse.success(
      'Feature flags habilitadas carregadas com sucesso!',
      mapEnabledKeys(keys),
    );
  }
}
