import { Test, TestingModule } from '@nestjs/testing';
import { AuthUser } from 'src/shared/decorators/current-user.decorator';
import { LogoutUseCase } from '../use-cases/logout.use-case';
import { RefreshTokenService } from '../services/refresh-token.service';

describe('LogoutUseCase', () => {
  let useCase: LogoutUseCase;
  const refreshTokenService = { revokeAll: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LogoutUseCase,
        { provide: RefreshTokenService, useValue: refreshTokenService },
      ],
    }).compile();

    useCase = module.get(LogoutUseCase);
    jest.clearAllMocks();
  });

  it('revoga refresh tokens de usuário interno', async () => {
    const user: AuthUser = {
      id: BigInt(1),
      email: 'admin@letscom.com',
      nome: 'Admin',
      tipoLogin: 'user',
      ativo: true,
      roles: ['admin'],
    };

    const result = await useCase.execute(user);

    expect(refreshTokenService.revokeAll).toHaveBeenCalledWith({
      kind: 'user',
      id: user.id,
      email: user.email,
      ativo: user.ativo,
    });
    expect(result.code).toBe(200);
    expect(result.message).toBe('Logout realizado com sucesso!');
  });

  it('revoga refresh tokens de subordinado', async () => {
    const user: AuthUser = {
      id: BigInt(10),
      email: 'sub@letscom.com',
      nome: 'Subordinado',
      tipoLogin: 'subordinado',
      ativo: true,
      clienteId: BigInt(5),
      roles: ['operador'],
    };

    await useCase.execute(user);

    expect(refreshTokenService.revokeAll).toHaveBeenCalledWith({
      kind: 'subordinado',
      id: user.id,
      email: user.email,
      ativo: user.ativo,
      clienteId: user.clienteId,
    });
  });

  it('retorna sucesso mesmo sem usuário autenticado', async () => {
    const result = await useCase.execute(undefined);

    expect(refreshTokenService.revokeAll).not.toHaveBeenCalled();
    expect(result.code).toBe(200);
  });
});
