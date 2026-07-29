import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from 'src/shared/constants/roles';
import { AuthUser, CurrentUser } from 'src/shared/decorators/current-user.decorator';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { ApiResponse } from 'src/shared/utils/api-response';
import { SyncFeatureFlagsDto } from '../dto/sync-feature-flags.dto';
import {
  mapEnabledKeys,
  mapUserFeatureFlags,
  mapUserFeatureFlagsPayload,
} from '../mappers/feature-flags.mapper';
import { UserFeatureFlagService } from '../services/user-feature-flag.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UserFeatureFlagController {
  constructor(private readonly service: UserFeatureFlagService) {}

  @Get('dados/feature-flags')
  @ApiOperation({ summary: 'Feature flags habilitadas do usuário autenticado' })
  async minhas(@CurrentUser() user: AuthUser) {
    const keys = await this.service.listarHabilitadasDoUsuarioAutenticado(
      user.id,
      user.tipoLogin,
    );
    return ApiResponse.success(
      'Feature flags habilitadas carregadas com sucesso!',
      mapEnabledKeys(keys),
    );
  }

  @Get(':user/feature-flags')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Lista feature flags de um usuário' })
  async index(@Param('user') userId: string) {
    const user = { id: BigInt(userId), nome: null };
    const flags = await this.service.listarPorUsuario(BigInt(userId));
    return ApiResponse.success(
      'Feature flags do usuário carregadas com sucesso!',
      mapUserFeatureFlagsPayload(user, flags),
    );
  }

  @Put(':user/feature-flags')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Sincroniza feature flags de um usuário' })
  async sync(@Param('user') userId: string, @Body() dto: SyncFeatureFlagsDto) {
    const flags = await this.service.sincronizar(BigInt(userId), dto.flags);
    return ApiResponse.success(
      'Feature flags do usuário sincronizadas com sucesso!',
      mapUserFeatureFlags(flags),
    );
  }
}
