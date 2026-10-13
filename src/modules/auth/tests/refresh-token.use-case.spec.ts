import { HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository';
import { JwtTokenService } from '../services/jwt-token.service';
import { RefreshTokenService } from '../services/refresh-token.service';

describe('RefreshTokenService (refresh)', () => {
  let service: RefreshTokenService;
  let rotate: jest.SpyInstance;

  beforeEach(() => {
    service = new RefreshTokenService(
      {} as PrismaService,
      {} as RefreshTokenRepository,
      {} as JwtTokenService,
      { get: jest.fn() } as unknown as ConfigService,
    );
    rotate = jest.spyOn(service, 'rotate');
  });

  it('retorna novos tokens quando rotação é bem-sucedida', async () => {
    rotate.mockResolvedValue({ access_token: 'new-access', refresh_token: 'new-refresh' });

    const result = await service.executeRefreshToken('valid-refresh');

    expect(result).toEqual({ access_token: 'new-access', refresh_token: 'new-refresh' });
    expect(rotate).toHaveBeenCalledWith('valid-refresh');
  });

  it('retorna 401 quando refresh token é inválido', async () => {
    rotate.mockRejectedValue(new Error('invalid'));

    await expect(service.executeRefreshToken('invalid-refresh')).rejects.toMatchObject({
      status: HttpStatus.UNAUTHORIZED,
      response: { code: 401, error: 'Refresh token inválido ou expirado' },
    });
  });
});
