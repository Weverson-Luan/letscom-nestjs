import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { RefreshTokenUseCase } from '../use-cases/refresh-token.use-case';
import { RefreshTokenService } from '../services/refresh-token.service';

describe('RefreshTokenUseCase', () => {
  let useCase: RefreshTokenUseCase;
  const refreshTokenService = { rotate: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshTokenUseCase,
        { provide: RefreshTokenService, useValue: refreshTokenService },
      ],
    }).compile();

    useCase = module.get(RefreshTokenUseCase);
    jest.clearAllMocks();
  });

  it('retorna novos tokens quando rotação é bem-sucedida', async () => {
    refreshTokenService.rotate.mockResolvedValue({
      access_token: 'new-access',
      refresh_token: 'new-refresh',
    });

    const result = await useCase.execute('valid-refresh');

    expect(result).toEqual({
      access_token: 'new-access',
      refresh_token: 'new-refresh',
    });
  });

  it('retorna 401 quando refresh token é inválido', async () => {
    refreshTokenService.rotate.mockRejectedValue(new Error('invalid'));

    await expect(useCase.execute('invalid-refresh')).rejects.toMatchObject({
      status: HttpStatus.UNAUTHORIZED,
      response: { code: 401, error: 'Refresh token inválido ou expirado' },
    });
  });
});
