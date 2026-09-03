import { Test, TestingModule } from '@nestjs/testing';
import { ResetPasswordUseCase } from '../use-cases/reset-password.use-case';
import { PasswordResetService } from '../services/password-reset.service';
import { BusinessException } from 'src/shared/exceptions/business.exception';

describe('ResetPasswordUseCase', () => {
  let useCase: ResetPasswordUseCase;
  const service = { resetPassword: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResetPasswordUseCase,
        { provide: PasswordResetService, useValue: service },
      ],
    }).compile();

    useCase = module.get(ResetPasswordUseCase);
    jest.clearAllMocks();
  });

  it('retorna 422 quando token está ausente', async () => {
    const result = await useCase.execute({ senha: '123456', nova_senha: '123456' });

    expect(result.status).toBe(200);
    expect(result.body.code).toBe(422);
    expect(result.body.errors.token).toBeDefined();
  });

  it('retorna 422 quando senhas não coincidem', async () => {
    const result = await useCase.execute({
      token: 'abc',
      senha: '123456',
      nova_senha: '654321',
    });

    expect(result.body.code).toBe(422);
    expect(result.body.errors.nova_senha).toBeDefined();
  });

  it('altera senha com sucesso', async () => {
    service.resetPassword.mockResolvedValue(undefined);

    const result = await useCase.execute({
      token: 'valid-token',
      senha: '123456',
      nova_senha: '123456',
    });

    expect(result.status).toBe(200);
    expect(result.body.code).toBe(200);
    expect(result.body.message).toBe('Senha alterada com sucesso!');
    expect(service.resetPassword).toHaveBeenCalledWith('valid-token', '123456');
  });

  it('retorna 422 em erro de regra de negócio', async () => {
    service.resetPassword.mockRejectedValue(new BusinessException('Token expirado'));

    const result = await useCase.execute({
      token: 'expired',
      senha: '123456',
      nova_senha: '123456',
    });

    expect(result.body.code).toBe(422);
    expect(result.body.errors.message).toBe('Token expirado');
  });
});
