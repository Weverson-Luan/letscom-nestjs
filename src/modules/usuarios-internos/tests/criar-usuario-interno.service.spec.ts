/**
 * IMPORTS
 */
import { Test } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';

// shared / exceptions
import { BusinessException } from 'src/shared/exceptions/business.exception';

// shared / prisma (conexão com o banco)
import { PrismaService } from 'src/shared/prisma/prisma.service';

// shared / repositories (vínculo usuário x papel)
import { RoleUserRepository } from 'src/shared/repositories/role-user.repository';

// shared / utils (hash de senha)
import { HashService } from 'src/shared/utils/hash.service';

// dto
import { CriarUsuarioInternoDto } from '../dto/criar-usuario-interno.dto';

// exceptions
import { UsuarioInternoDuplicadoException } from '../exceptions/usuario-interno-duplicado.exception';

// repositories
import { CriarUsuarioInternoRepository } from '../repositories/criar-usuario-interno.repository';

// services
import { CriarUsuarioInternoService } from '../services/criar-usuario-interno.service';

// fixtures do módulo (usuário do Prisma)
import { criarUsuarioFake } from './fixtures';

describe('CriarUsuarioInternoService', () => {
  const transacao = { marcador: 'transacao' };
  const prisma = {
    $transaction: jest.fn((callback: (cliente: unknown) => unknown) => callback(transacao)),
  };
  const repository = { buscarIdPapel: jest.fn(), criar: jest.fn() };
  const roleUserRepository = { attachToUser: jest.fn() };
  const hash = { make: jest.fn() };

  let service: CriarUsuarioInternoService;

  const dados: CriarUsuarioInternoDto = {
    nome: 'Maria Silva',
    email: 'maria@letscom.com',
    senha: 'senha123',
    telefone: '11999999999',
    tipo_pessoa: 'F',
    papel: 'producao',
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        CriarUsuarioInternoService,
        { provide: PrismaService, useValue: prisma },
        { provide: CriarUsuarioInternoRepository, useValue: repository },
        { provide: RoleUserRepository, useValue: roleUserRepository },
        { provide: HashService, useValue: hash },
      ],
    }).compile();
    service = moduleRef.get(CriarUsuarioInternoService);
    hash.make.mockResolvedValue('hash-novo');
    repository.buscarIdPapel.mockResolvedValue({ id: 3n });
    repository.criar.mockResolvedValue(criarUsuarioFake());
  });

  it('cria o usuário com senha em hash e vincula o papel na mesma transação', async () => {
    const resultado = await service.execute(dados);

    expect(repository.buscarIdPapel).toHaveBeenCalledWith('producao', transacao);
    expect(repository.criar).toHaveBeenCalledWith(
      {
        nome: 'Maria Silva',
        email: 'maria@letscom.com',
        senha: 'hash-novo',
        telefone: '11999999999',
        tipoPessoa: 'F',
        documento: null,
        ativo: true,
      },
      transacao,
    );
    expect(roleUserRepository.attachToUser).toHaveBeenCalledWith(transacao, 12n, 3n, true);
    expect(resultado).toMatchObject({ id: 12n, papel: 'producao' });
  });

  it('respeita ativo e documento informados', async () => {
    await service.execute({ ...dados, ativo: false, documento: '12345678901' });

    expect(repository.criar).toHaveBeenCalledWith(
      expect.objectContaining({ ativo: false, documento: '12345678901' }),
      transacao,
    );
  });

  it('falha quando o papel não existe na tabela roles', async () => {
    repository.buscarIdPapel.mockResolvedValue(null);

    await expect(service.execute(dados)).rejects.toBeInstanceOf(BusinessException);
    expect(repository.criar).not.toHaveBeenCalled();
  });

  it('converte e-mail duplicado em 409', async () => {
    repository.criar.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('dup', {
        code: 'P2002',
        clientVersion: 'test',
        meta: { target: 'users_email_key' },
      }),
    );

    const promessa = service.execute(dados);

    await expect(promessa).rejects.toBeInstanceOf(UsuarioInternoDuplicadoException);
    await expect(promessa).rejects.toMatchObject({
      message: 'Já existe um usuário com este e-mail.',
      status: HttpStatus.CONFLICT,
    });
    expect(roleUserRepository.attachToUser).not.toHaveBeenCalled();
  });
});
