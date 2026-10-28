import { Test } from '@nestjs/testing';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { RoleUserRepository } from 'src/shared/repositories/role-user.repository';
import { HashService } from 'src/shared/utils/hash.service';
import { CriarUsuarioRepository } from '../repositories/criar-usuario.repository';
import { CriarUsuarioService } from '../services/criar-usuario.service';

describe('CriarUsuarioService', () => {
  let service: CriarUsuarioService;
  const transacao = { transacao: true };
  const repository = {
    criar: jest.fn(),
    vincularConsultor: jest.fn(),
    vincularTipoEntrega: jest.fn(),
  };
  const prisma = { $transaction: jest.fn((callback) => callback(transacao)) };
  const hash = { make: jest.fn() };
  const roleUserRepo = { attachToUser: jest.fn() };

  const dados = {
    nome: 'Empresa XYZ',
    email: 'contato@empresa.com',
    senha: '123456',
    telefone: '11999999999',
    tipo_pessoa: 'juridica',
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    hash.make.mockResolvedValue('hash');
    repository.criar.mockResolvedValue({ id: BigInt(20) });
    const moduleRef = await Test.createTestingModule({
      providers: [
        CriarUsuarioService,
        { provide: PrismaService, useValue: prisma },
        { provide: CriarUsuarioRepository, useValue: repository },
        { provide: HashService, useValue: hash },
        { provide: RoleUserRepository, useValue: roleUserRepo },
      ],
    }).compile();

    service = moduleRef.get(CriarUsuarioService);
  });

  it('cria o usuário com senha criptografada e ativo por padrão', async () => {
    await expect(service.execute(dados)).resolves.toEqual({ id: BigInt(20) });

    expect(repository.criar).toHaveBeenCalledWith(
      {
        nome: 'Empresa XYZ',
        email: 'contato@empresa.com',
        senha: 'hash',
        documento: null,
        telefone: '11999999999',
        tipoPessoa: 'juridica',
        ativo: true,
      },
      transacao,
    );
    expect(roleUserRepo.attachToUser).not.toHaveBeenCalled();
    expect(repository.vincularConsultor).not.toHaveBeenCalled();
    expect(repository.vincularTipoEntrega).not.toHaveBeenCalled();
  });

  it('não criptografa senha ausente e respeita ativo: false', async () => {
    await service.execute({ ...dados, senha: undefined, ativo: false });

    expect(hash.make).not.toHaveBeenCalled();
    expect(repository.criar).toHaveBeenCalledWith(
      expect.objectContaining({ senha: undefined, ativo: false }),
      transacao,
    );
  });

  it('vincula role, consultor e tipo de entrega na mesma transação', async () => {
    await service.execute({ ...dados, roles: 3, consultor_id: 5, tipo_entrega_id: 7 });

    expect(roleUserRepo.attachToUser).toHaveBeenCalledWith(transacao, BigInt(20), BigInt(3), true);
    expect(repository.vincularConsultor).toHaveBeenCalledWith(BigInt(20), BigInt(5), transacao);
    expect(repository.vincularTipoEntrega).toHaveBeenCalledWith(BigInt(20), BigInt(7), transacao);
  });
});
