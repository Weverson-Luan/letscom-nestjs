import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { LoginUseCase } from './login.use-case';
import { JwtTokenService } from '../services/jwt-token.service';
import { RefreshTokenService } from '../services/refresh-token.service';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { HashService } from 'src/shared/utils/hash.service';

describe('LoginUseCase', () => {
  let useCase: LoginUseCase;
  const configGet = jest.fn();

  beforeEach(async () => {
    configGet.mockImplementation((key: string) => {
      if (key === 'auth.bloqueioLoginClienteSubordinado') return true;
      if (key === 'auth.mensagemInstabilidade') return 'Sistema indisponível';
      return undefined;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoginUseCase,
        {
          provide: PrismaService,
          useValue: {
            user: { findFirst: jest.fn().mockResolvedValue(null) },
            userCliente: { findFirst: jest.fn().mockResolvedValue(null) },
            clienteConsultor: { findFirst: jest.fn() },
          },
        },
        {
          provide: HashService,
          useValue: { check: jest.fn().mockResolvedValue(false) },
        },
        {
          provide: JwtTokenService,
          useValue: { createToken: jest.fn() },
        },
        {
          provide: RefreshTokenService,
          useValue: { issue: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: { get: configGet },
        },
      ],
    }).compile();

    useCase = module.get(LoginUseCase);
  });

  it('retorna 401 quando credenciais são inválidas', async () => {
    await expect(
      useCase.execute({ email: 'x@y.com', senha: '123456' }),
    ).rejects.toMatchObject({ status: 401 });
  });
});
