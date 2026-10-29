/**
 * IMPORTS
 */
import { HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';

// shared / prisma (conexão com o banco)
import { PrismaService } from 'src/shared/prisma/prisma.service';

// shared / exceptions
import { BusinessException } from 'src/shared/exceptions/business.exception';

// shared / repositories
import { RoleUserRepository } from 'src/shared/repositories/role-user.repository';

// shared / utils (hash de senha)
import { HashService } from 'src/shared/utils/hash.service';

// repositories
import { CriarUsuarioClienteRepository } from '../repositories/criar-usuario-cliente.repository';

// services
import { CriarUsuarioClienteService } from '../services/criar-usuario-cliente.service';

describe('CriarUsuarioClienteService', () => {
  let service: CriarUsuarioClienteService;
  const transacao = { transacao: true };
  const repository = {
    buscarPorEmail: jest.fn(),
    buscarPorDocumento: jest.fn(),
    buscarPapelSubordinado: jest.fn(),
    criar: jest.fn(),
  };
  const prisma = { $transaction: jest.fn((callback) => callback(transacao)) };
  const hash = { make: jest.fn() };
  const roleUserRepository = { attachToUserCliente: jest.fn() };

  const dados = { cliente_id: 9, email: 'sub@empresa.com', senha: 'senha123' };

  beforeEach(async () => {
    jest.clearAllMocks();
    hash.make.mockResolvedValue('hash');
    repository.buscarPorEmail.mockResolvedValue(null);
    repository.buscarPorDocumento.mockResolvedValue(null);
    repository.buscarPapelSubordinado.mockResolvedValue({ id: 5n });
    repository.criar.mockResolvedValue({ id: 30n });
    const moduleRef = await Test.createTestingModule({
      providers: [
        CriarUsuarioClienteService,
        { provide: PrismaService, useValue: prisma },
        { provide: CriarUsuarioClienteRepository, useValue: repository },
        { provide: HashService, useValue: hash },
        { provide: RoleUserRepository, useValue: roleUserRepository },
      ],
    }).compile();

    service = moduleRef.get(CriarUsuarioClienteService);
  });

  it('cria o usuário com senha em hash, ativo por padrão e papel subordinado', async () => {
    await expect(service.execute(dados)).resolves.toEqual({ id: 30n });

    expect(hash.make).toHaveBeenCalledWith('senha123');
    expect(repository.criar).toHaveBeenCalledWith(
      {
        clientePrincipal: { connect: { id: 9n } },
        email: 'sub@empresa.com',
        nome: null,
        senha: 'hash',
        documento: null,
        ativo: true,
      },
      transacao,
    );
    expect(repository.buscarPorDocumento).not.toHaveBeenCalled();
    expect(roleUserRepository.attachToUserCliente).toHaveBeenCalledWith(transacao, 30n, 5n, true);
  });

  it('usa o role_id informado sem buscar o papel padrão', async () => {
    await service.execute({ ...dados, role_id: 7, ativo: false, nome: 'Sub', documento: '123' });

    expect(repository.buscarPapelSubordinado).not.toHaveBeenCalled();
    expect(repository.buscarPorDocumento).toHaveBeenCalledWith('123', transacao);
    expect(repository.criar).toHaveBeenCalledWith(
      expect.objectContaining({ nome: 'Sub', documento: '123', ativo: false }),
      transacao,
    );
    expect(roleUserRepository.attachToUserCliente).toHaveBeenCalledWith(transacao, 30n, 7n, true);
  });

  it.each([
    ['cliente_id', 'O cliente_id é obrigatório.'],
    ['email', 'O e-mail é obrigatório.'],
    ['senha', 'A senha é obrigatória.'],
  ])('lança 422 quando %s não é informado', async (campo, mensagem) => {
    const erro = await service
      .execute({ ...dados, [campo]: undefined })
      .catch((excecao) => excecao);

    expect(erro).toBeInstanceOf(BusinessException);
    expect(erro.message).toBe(mensagem);
    expect(erro.getStatus()).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('lança 422 quando o e-mail já está cadastrado', async () => {
    repository.buscarPorEmail.mockResolvedValue({ id: 1n });

    await expect(service.execute(dados)).rejects.toThrow('E-mail já cadastrado no sistema.');
    expect(repository.buscarPorEmail).toHaveBeenCalledWith('sub@empresa.com', transacao);
    expect(repository.criar).not.toHaveBeenCalled();
  });

  it('lança 422 quando o documento já está cadastrado', async () => {
    repository.buscarPorDocumento.mockResolvedValue({ id: 1n });

    await expect(service.execute({ ...dados, documento: '123' })).rejects.toThrow(
      'Documento (CPF/CNPJ) já cadastrado no sistema.',
    );
    expect(repository.criar).not.toHaveBeenCalled();
  });

  it('falha quando o papel padrão subordinado não existe', async () => {
    repository.buscarPapelSubordinado.mockResolvedValue(null);

    await expect(service.execute(dados)).rejects.toThrow(
      'Role padrão "Subordinado" não encontrada.',
    );
    expect(roleUserRepository.attachToUserCliente).not.toHaveBeenCalled();
  });
});
