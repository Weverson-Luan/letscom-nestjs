/**
 * IMPORTS
 */

import { Body, Controller, Header, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

// services
import { GerarCodigoAcessoBackofficeService } from '../services/gerar-codigo-acesso-backoffice.service';
import { TrocarCodigoAcessoBackofficeService } from '../services/trocar-codigo-acesso-backoffice.service';

// shared / decorators
import { AuthUser, CurrentUser } from 'src/shared/decorators/current-user.decorator';
import { RequireFeatures } from 'src/shared/decorators/features.decorator';
import { Public } from 'src/shared/decorators/public.decorator';
import { Feature } from 'src/shared/auth/features';

// typings
import { TrocarCodigoAcessoBackofficeDto } from '../dto/trocar-codigo-acesso-backoffice.dto';

/** Login único portal → backoffice (apps em origens diferentes). */
@ApiTags('auth')
@Controller('auth/codigo-acesso-backoffice')
export class AcessoBackofficeController {
  constructor(
    private readonly gerarCodigoAcessoBackofficeService: GerarCodigoAcessoBackofficeService,
    private readonly trocarCodigoAcessoBackofficeService: TrocarCodigoAcessoBackofficeService,
  ) {}

  @Post()
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiBearerAuth()
  @RequireFeatures(Feature.ACESSAR_BACKOFFICE)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Gera código de uso único (60s) para abrir o backoffice já logado.' })
  gerar(@CurrentUser() user: AuthUser) {
    return this.gerarCodigoAcessoBackofficeService.execute(user);
  }

  @Public()
  @Post('trocar')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Troca o código de acesso por access/refresh token do backoffice.' })
  trocar(@Body() dto: TrocarCodigoAcessoBackofficeDto) {
    return this.trocarCodigoAcessoBackofficeService.execute(dto);
  }
}
