import { Body, Controller, Post, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Public } from 'src/shared/decorators/public.decorator';
import { RequestResetDto } from '../dto/request-reset.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { RequestPasswordResetUseCase } from '../use-cases/request-password-reset.use-case';
import { ResetPasswordUseCase } from '../use-cases/reset-password.use-case';

@ApiTags('auth')
@Controller('users')
export class PasswordResetController {
  constructor(
    private readonly requestResetUseCase: RequestPasswordResetUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
  ) {}

  @Public()
  @Post('recuperar-senha')
  @ApiOperation({ summary: 'Solicita e-mail de recuperação de senha' })
  async requestReset(
    @Body() body: RequestResetDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { status, body: responseBody } = await this.requestResetUseCase.execute(
      body as unknown as Record<string, any>,
    );
    res.status(status);
    return responseBody;
  }

  @Public()
  @Post('redefinir-senha')
  @ApiOperation({ summary: 'Redefine a senha a partir do token' })
  async resetPassword(
    @Body() body: ResetPasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { status, body: responseBody } = await this.resetPasswordUseCase.execute(
      body as unknown as Record<string, any>,
    );
    res.status(status);
    return responseBody;
  }
}
