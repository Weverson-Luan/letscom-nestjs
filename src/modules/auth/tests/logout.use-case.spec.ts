import { ConfigService } from '@nestjs/config';
import { AuthUser } from 'src/shared/decorators/current-user.decorator';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository';
import { JwtTokenService } from '../services/jwt-token.service';
import { RefreshTokenService } from '../services/refresh-token.service';

describe('RefreshTokenService (logout)', () => {
  let service: RefreshTokenService;
  let revokeAll: jest.SpyInstance;

  beforeEach(() => {
    service = new RefreshTokenService(
      {} as PrismaService,
      {} as RefreshTokenRepository,
      {} as JwtTokenService,
      { get: jest.fn() } as unknown as ConfigService,
    );
    revokeAll = jest.spyOn(service, 'revokeAll').mockResolvedValue(undefined);
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

    const result = await service.execute(user);

    expect(revokeAll).toHaveBeenCalledWith({
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
      roles: ['subordinado'],
    };

    await service.execute(user);

    expect(revokeAll).toHaveBeenCalledWith({
      kind: 'subordinado',
      id: user.id,
      email: user.email,
      ativo: user.ativo,
      clienteId: user.clienteId,
    });
  });

  it('retorna sucesso mesmo sem usuário autenticado', async () => {
    const result = await service.execute(undefined);

    expect(revokeAll).not.toHaveBeenCalled();
    expect(result.code).toBe(200);
  });
});
