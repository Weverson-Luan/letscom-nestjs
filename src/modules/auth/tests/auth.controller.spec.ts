import { Test, type TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthController } from '../controllers/auth.controller';
import { LoginUseCase } from '../use-cases/login.use-case';
import { RefreshTokenUseCase } from '../use-cases/refresh-token.use-case';
import { LogoutUseCase } from '../use-cases/logout.use-case';

describe('AuthController', () => {
  let controller: AuthController;

  const loginUseCase = { execute: jest.fn() };
  const refreshTokenUseCase = { execute: jest.fn() };
  const logoutUseCase = { execute: jest.fn() };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: LoginUseCase, useValue: loginUseCase },
        { provide: RefreshTokenUseCase, useValue: refreshTokenUseCase },
        { provide: LogoutUseCase, useValue: logoutUseCase },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = moduleFixture.get(AuthController);
    jest.clearAllMocks();
  });

  it('login retorna tokens e dados do usuário', async () => {
    loginUseCase.execute.mockResolvedValue({
      code: 200,
      message: 'Usuário logado com sucesso!',
      data: { id: 1, tipo_login: 'user', email: 'admin@letscom.com' },
      access_token: 'access-token',
      refresh_token: 'refresh-token',
    });

    const result = await controller.login({
      email: 'admin@letscom.com',
      senha: 'Senha123',
    });

    expect(result).toEqual({
      code: 200,
      message: 'Usuário logado com sucesso!',
      data: { id: 1, tipo_login: 'user', email: 'admin@letscom.com' },
      access_token: 'access-token',
      refresh_token: 'refresh-token',
    });
    expect(loginUseCase.execute).toHaveBeenCalledWith({
      email: 'admin@letscom.com',
      senha: 'Senha123',
    });
  });

  it('refresh renova tokens', async () => {
    refreshTokenUseCase.execute.mockResolvedValue({
      access_token: 'new-access',
      refresh_token: 'new-refresh',
    });

    const result = await controller.refresh({ refresh_token: 'old-refresh' });

    expect(result).toEqual({
      access_token: 'new-access',
      refresh_token: 'new-refresh',
    });
    expect(refreshTokenUseCase.execute).toHaveBeenCalledWith('old-refresh');
  });

  it('logout revoga sessão do usuário autenticado', async () => {
    logoutUseCase.execute.mockResolvedValue({
      code: 200,
      status: 'success',
      message: 'Logout realizado com sucesso!',
      data: [],
      pagination: null,
    });

    const user: import('src/shared/decorators/current-user.decorator').AuthUser = {
      id: BigInt(1),
      email: 'admin@letscom.com',
      nome: 'Admin',
      tipoLogin: 'user',
      ativo: true,
      roles: ['admin'],
    };

    const result = await controller.logout(user);

    expect(result.message).toBe('Logout realizado com sucesso!');
    expect(logoutUseCase.execute).toHaveBeenCalledWith(user);
  });
});
