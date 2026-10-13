import { PrismaService } from 'src/shared/prisma/prisma.service';
import { PasswordResetRepository } from '../repositories/password-reset.repository';
import { AuthResetPasswordService } from '../services/auth-reset-password.service';

describe('AuthResetPasswordService', () => {
  const repository = { findToken: jest.fn(), deleteToken: jest.fn() };
  const prisma = { user: { findUnique: jest.fn(), update: jest.fn() } };
  let service: AuthResetPasswordService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthResetPasswordService(
      prisma as unknown as PrismaService,
      repository as unknown as PasswordResetRepository,
    );
  });

  it('retorna 422 quando token está ausente', async () => {
    const result = await service.execute({ senha: '123456', nova_senha: '123456' });

    expect(result.status).toBe(200);
    expect(result.body.code).toBe(422);
    expect(result.body.errors.token).toBeDefined();
  });

  it('retorna 422 quando senhas não coincidem', async () => {
    const result = await service.execute({
      token: 'abc',
      senha: '123456',
      nova_senha: '654321',
    });

    expect(result.body.code).toBe(422);
    expect(result.body.errors.nova_senha).toBeDefined();
  });

  it('altera senha com sucesso', async () => {
    repository.findToken.mockResolvedValue({ email: 'user@letscom.com', createdAt: new Date() });
    prisma.user.findUnique.mockResolvedValue({ id: BigInt(1), email: 'user@letscom.com' });

    const result = await service.execute({
      token: 'valid-token',
      senha: '123456',
      nova_senha: '123456',
    });

    expect(result.status).toBe(200);
    expect(result.body.code).toBe(200);
    expect(result.body.message).toBe('Senha alterada com sucesso!');
    expect(prisma.user.update).toHaveBeenCalled();
    expect(repository.deleteToken).toHaveBeenCalledWith('user@letscom.com');
  });

  it('retorna 422 quando o token é inválido', async () => {
    repository.findToken.mockResolvedValue(null);

    const result = await service.execute({
      token: 'expired',
      senha: '123456',
      nova_senha: '123456',
    });

    expect(result.body.code).toBe(422);
    expect(result.body.errors.message).toBe('Token inválido ou expirado!');
  });
});
