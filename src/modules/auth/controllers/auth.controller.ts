/**
 * IMPORTS
 */

import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

// use cases
import { AuthSubordinateUserService } from '../services/auth-subordinate-user.service';
import { AuthClientUserService } from '../services/auth-client-user.service';
import { RefreshTokenService } from '../services/refresh-token.service';

// shared / decorators
import { AuthUser, CurrentUser } from 'src/shared/decorators/current-user.decorator';
import { Public } from 'src/shared/decorators/public.decorator';

// typings
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { LoginDto } from '../dto/login.dto';


@ApiTags('auth')
@Controller()
export class AuthController {
  constructor(
    private readonly authUserService: AuthClientUserService,
    private readonly authSubordinateUserService: AuthSubordinateUserService,
    private readonly refreshTokenUseCase: RefreshTokenService,
    private readonly logoutUseCase: RefreshTokenService,
  ) {}

  @Public()
  @Post('login')
  @ApiBearerAuth()
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Login (cliente + admin, + consultor + prod, recpcao e balcao).' })
  login(@Body() dto: LoginDto) {
    return this.authUserService.execute(dto);
  }

  @Public()
  @Post('login-subordinado')
  @ApiBearerAuth()
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Login (usuário interno ou subordinado).' })
  loginSubordinado(@Body() dto: LoginDto) {
    return this.authSubordinateUserService.execute(dto);
  }

  @Public()
  @Post('auth/refresh')
  @HttpCode(200)
  @ApiBearerAuth()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Renova o access token (rotação de refresh token).' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.refreshTokenUseCase.rotate(dto.refresh_token);
  }

  @Post('auth/logout')
  @HttpCode(200)
  @ApiBearerAuth()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Logout (revoga refresh tokens).' })
  logout(@CurrentUser() user: AuthUser) {
    return this.logoutUseCase.execute(user);
  }
}
