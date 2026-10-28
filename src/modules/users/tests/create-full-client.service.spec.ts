/**
 * IMPORTS
 */
import { HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma, TipoEndereco } from '@prisma/client';

// services
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { CreateFullClientService } from '../services/create-full-client.service';

// repository / roles user
import { RoleUserRepository } from 'src/shared/repositories/role-user.repository';

// utils
import { HashService } from 'src/shared/utils/hash.service';

// exceptions
import { CadastroDuplicadoException } from '../exceptions/cadastro-duplicado.exception';

describe('CreateFullClientService', () => {
  let service: CreateFullClientService;

  const transacao = {
    user: { create: jest.fn() },
    clienteConsultor: { create: jest.fn() },
    tipoEntregaUser: { create: jest.fn() },
    endereco: { create: jest.fn() },
    userCliente: { create: jest.fn() },
  };
  const prisma = { $transaction: jest.fn() };
  const hash = { make: jest.fn() };
  const config = { get: jest.fn() };
  const roleUserRepo = { attachToUser: jest.fn(), attachToUserCliente: jest.fn() };

  const dados = {
    cliente: {
      nome: 'Empresa XYZ',
      email: 'contato@empresa.com',
      ativo: true,
      documento: '12345678000199',
      telefone: '11988887777',
      tipo_pessoa: 'J' as const,
      senha: 'senha123',
    },
    endereco: {
      logradouro: 'Rua das Flores',
      numero: '100',
      bairro: 'Centro',
      cidade: 'São Paulo',
      estado: 'SP',
      cep: '01001000',
      tipo_endereco: TipoEndereco.entrega,
      nome_responsavel: 'João',
      email: 'resp@empresa.com',
      setor: 'RH',
      telefone: '11977776666',
    },
  };

  function erroPrisma(code: string, target?: unknown) {
    return new Prisma.PrismaClientKnownRequestError('falhou', {
      code,
      clientVersion: 'test',
      meta: target ? { target } : undefined,
    });
  }

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation((callback: (t: typeof transacao) => unknown) =>
      callback(transacao),
    );
    hash.make.mockImplementation(async (senha: string) => `hash:${senha}`);
    config.get.mockReturnValue('senha-padrao');
    transacao.user.create.mockResolvedValue({
      id: 10n,
      email: 'contato@empresa.com',
      senha: 'hash',
    });
    transacao.endereco.create.mockResolvedValue({ id: 1n });
    transacao.userCliente.create.mockImplementation(async ({ data }) => ({ id: 20n, ...data }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateFullClientService,
        { provide: PrismaService, useValue: prisma },
        { provide: HashService, useValue: hash },
        { provide: ConfigService, useValue: config },
        { provide: RoleUserRepository, useValue: roleUserRepo },
      ],
    }).compile();

    service = module.get(CreateFullClientService);
  });

  it('cria cliente, endereço com CEP formatado e o subordinado padrão, sem devolver senhas', async () => {
    const resultado = await service.executar(dados);

    expect(transacao.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ email: 'contato@empresa.com', senha: 'hash:senha123' }),
    });
    expect(transacao.endereco.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: 10n, cep: '01001-000', tipoEndereco: 'entrega' }),
    });
    expect(transacao.userCliente.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        clienteId: 10n,
        nome: 'Letscom Comercial',
        email: 'comercial10@letscom.com.br',
        senha: 'hash:senha-padrao',
      }),
    });
    expect(resultado.user).not.toHaveProperty('senha');
    expect(resultado.usuarios_cliente).toHaveLength(1);
    resultado.usuarios_cliente.forEach((u) => expect(u).not.toHaveProperty('senha'));
    expect(roleUserRepo.attachToUser).not.toHaveBeenCalled();
    expect(transacao.clienteConsultor.create).not.toHaveBeenCalled();
    expect(transacao.tipoEntregaUser.create).not.toHaveBeenCalled();
  });

  it('vincula papel, consultor, tipo de entrega e papel do subordinado quando informados', async () => {
    await service.executar({
      ...dados,
      cliente: { ...dados.cliente, roles: 3, consultor_id: 4, tipo_entrega_id: 5 },
      usuarios_cliente: [{ email: 'sub@empresa.com', senha: 'senha123', ativo: true, role_id: 6 }],
    });

    expect(roleUserRepo.attachToUser).toHaveBeenCalledWith(transacao, 10n, 3n, true);
    expect(transacao.clienteConsultor.create).toHaveBeenCalledWith({
      data: { clienteId: 10n, consultorId: 4n },
    });
    expect(transacao.tipoEntregaUser.create).toHaveBeenCalledWith({
      data: { clienteId: 10n, tipoEntregaId: 5n },
    });
    expect(roleUserRepo.attachToUserCliente).toHaveBeenCalledWith(transacao, 20n, 6n, true);
  });

  it('lança CadastroDuplicadoException (409) quando um índice único é violado', async () => {
    prisma.$transaction.mockRejectedValue(erroPrisma('P2002', 'users_email_key'));

    const promessa = service.executar(dados);

    await expect(promessa).rejects.toBeInstanceOf(CadastroDuplicadoException);
    await expect(promessa).rejects.toMatchObject({
      message: 'Já existe um cliente com este e-mail.',
      status: HttpStatus.CONFLICT,
    });
  });

  it('repassa outros erros do Prisma sem converter', async () => {
    const erro = erroPrisma('P2003');
    prisma.$transaction.mockRejectedValue(erro);

    await expect(service.executar(dados)).rejects.toBe(erro);
  });
});
