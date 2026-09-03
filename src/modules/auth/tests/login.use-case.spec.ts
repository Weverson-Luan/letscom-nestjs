import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpException } from '@nestjs/common';
import { LoginUseCase } from '../use-cases/login.use-case';
import { JwtTokenService } from '../services/jwt-token.service';
import { RefreshTokenService } from '../services/refresh-token.service';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { HashService } from 'src/shared/utils/hash.service';
import { RoleUserRepository } from 'src/shared/repositories/role-user.repository';

describe('LoginUseCase', () => {
  let useCase: LoginUseCase;

  const prisma = {
    user: { findFirst: jest.fn() },
    userCliente: { findFirst: jest.fn() },
    clienteConsultor: { findFirst: jest.fn() },
  };
  const hash = { check: jest.fn() };
  const jwtTokenService = { createToken: jest.fn().mockReturnValue('access-token') };
  const refreshTokenService = { issue: jest.fn().mockResolvedValue('refresh-token') };
  const roleUserRepo = {
    findPrimaryRoleForUser: jest.fn(),
    findPrimaryRoleForUserCliente: jest.fn(),
  };
  const configGet = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    configGet.mockImplementation((key: string) => {
      if (key === 'auth.bloqueioLoginClienteSubordinado') return true;
      if (key === 'auth.mensagemInstabilidade') return 'Sistema indisponível';
      return undefined;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoginUseCase,
        { provide: PrismaService, useValue: prisma },
        { provide: HashService, useValue: hash },
        { provide: JwtTokenService, useValue: jwtTokenService },
        { provide: RefreshTokenService, useValue: refreshTokenService },
        { provide: ConfigService, useValue: { get: configGet } },
        { provide: RoleUserRepository, useValue: roleUserRepo },
      ],
    }).compile();

    useCase = module.get(LoginUseCase);
  });

  it('retorna 401 quando credenciais são inválidas', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.userCliente.findFirst.mockResolvedValue(null);

    await expect(
      useCase.execute({ email: 'x@y.com', senha: '123456' }),
    ).rejects.toMatchObject({ status: 401 });
  });

  it('autentica usuário interno com sucesso', async () => {
    const user = {
      id: BigInt(1),
      nome: 'Admin Letscom',
      email: 'admin@letscom.com',
      senha: 'hash',
      ativo: true,
      documento: '12345678901',
      tipoPessoa: 'F',
    };
    prisma.user.findFirst.mockResolvedValue(user);
    hash.check.mockResolvedValue(true);
    roleUserRepo.findPrimaryRoleForUser.mockResolvedValue({ id: 1, nome: 'admin' });
    prisma.clienteConsultor.findFirst.mockResolvedValue(null);

    const result = await useCase.execute({ email: user.email, senha: 'Senha123' });

    expect(result.code).toBe(200);
    expect(result.message).toBe('Usuário logado com sucesso!');
    expect(result.data.tipo_login).toBe('user');
    expect(result.access_token).toBe('access-token');
    expect(result.refresh_token).toBe('refresh-token');
    expect(jwtTokenService.createToken).toHaveBeenCalledWith(
      expect.objectContaining({ sub: user.id, tipo_login: 'user' }),
    );
  });

  it('rejeita usuário interno desativado', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: BigInt(1),
      email: 'inativo@letscom.com',
      senha: 'hash',
      ativo: false,
    });
    hash.check.mockResolvedValue(true);

    await expect(
      useCase.execute({ email: 'inativo@letscom.com', senha: 'Senha123' }),
    ).rejects.toMatchObject({ status: 422 });
  });

  it('bloqueia login de cliente interno quando flag está ativa', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: BigInt(2),
      nome: 'Cliente',
      email: 'cliente@letscom.com',
      senha: 'hash',
      ativo: true,
      documento: null,
      tipoPessoa: 'J',
    });
    hash.check.mockResolvedValue(true);
    roleUserRepo.findPrimaryRoleForUser.mockResolvedValue({ id: 2, nome: 'cliente' });

    await expect(
      useCase.execute({ email: 'cliente@letscom.com', senha: 'Senha123' }),
    ).rejects.toMatchObject({ status: 422 });
  });

  it('autentica subordinado com sucesso quando bloqueio está desativado', async () => {
    configGet.mockImplementation((key: string) => {
      if (key === 'auth.bloqueioLoginClienteSubordinado') return false;
      return undefined;
    });

    prisma.user.findFirst.mockResolvedValue(null);
    prisma.userCliente.findFirst.mockResolvedValue({
      id: BigInt(10),
      nome: 'Subordinado',
      email: 'sub@letscom.com',
      senha: 'hash',
      ativo: true,
      documento: null,
      clienteId: BigInt(5),
      clientePrincipal: { id: BigInt(5), nome: 'Cliente Principal', senha: 'x' },
    });
    hash.check.mockResolvedValue(true);
    roleUserRepo.findPrimaryRoleForUserCliente.mockResolvedValue({ id: 3, nome: 'operador' });
    prisma.clienteConsultor.findFirst.mockResolvedValue(null);

    const result = await useCase.execute({ email: 'sub@letscom.com', senha: 'Senha123' });

    expect(result.code).toBe(200);
    expect(result.message).toBe('Usuário subordinado logado com sucesso!');
    expect(result.data.tipo_login).toBe('subordinado');
    expect(result.data.cliente_principal).not.toHaveProperty('senha');
  });

  it('bloqueia login de subordinado quando flag está ativa', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.userCliente.findFirst.mockResolvedValue({
      id: BigInt(10),
      email: 'sub@letscom.com',
      senha: 'hash',
      ativo: true,
      clientePrincipal: null,
    });
    hash.check.mockResolvedValue(true);

    await expect(
      useCase.execute({ email: 'sub@letscom.com', senha: 'Senha123' }),
    ).rejects.toBeInstanceOf(HttpException);
  });
});
