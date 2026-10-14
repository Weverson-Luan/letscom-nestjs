/**
 * IMPORTS
 */

import { Body, Controller, Post, Res, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { Response } from 'express';

// services
import { AuthResetPasswordService } from '../services/auth-reset-password.service';
import { RequestPasswordResetUseCase } from '../services/request-password-reset.service';

// shared / public
import { Public } from 'src/shared/decorators/public.decorator';

// typings
import { RequestResetDto } from '../dto/request-reset.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';

@ApiTags('auth')
@Controller('users')
export class PasswordResetController {
  constructor(
    private readonly requestResetUseCase: RequestPasswordResetUseCase,
    private readonly resetPasswordUseCase: AuthResetPasswordService,
  ) {}

  @Public()
  @Post('recuperar-senha')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Solicita e-mail de recuperação de senha.' })
  async requestReset(@Body() body: RequestResetDto, @Res({ passthrough: true }) res: Response) {
    const { status, body: responseBody } = await this.requestResetUseCase.execute(
      body as unknown as Record<string, any>,
    );
    res.status(status);
    return responseBody;
  }

  @Public()
  @Post('redefinir-senha')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Redefine a senha a partir do token.' })
  async resetPassword(@Body() body: ResetPasswordDto, @Res({ passthrough: true }) res: Response) {
    const { status, body: responseBody } = await this.resetPasswordUseCase.execute(
      body as unknown as Record<string, any>,
    );
    res.status(status);
    return responseBody;
  }
}
