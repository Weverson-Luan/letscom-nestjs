import { Test } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { HashService } from 'src/shared/utils/hash.service';
import { AtualizarUsuarioInternoDto } from '../dto/atualizar-usuario-interno.dto';
import { UsuarioInternoNaoEncontradoException } from '../exceptions/usuario-interno-nao-encontrado.exception';
import { UsuarioInternoRepository } from '../repositories/usuario-interno.repository';
import { AtualizarUsuarioInternoService } from '../services/atualizar-usuario-interno.service';
import { criarUsuarioFake } from './fixtures';

describe('AtualizarUsuarioInternoService', () => {
  const repository = { buscarPorId: jest.fn(), atualizar: jest.fn() };
  const hash = { make: jest.fn() };
  let service: AtualizarUsuarioInternoService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AtualizarUsuarioInternoService,
        { provide: UsuarioInternoRepository, useValue: repository },
        { provide: HashService, useValue: hash },
      ],
    }).compile();
    service = moduleRef.get(AtualizarUsuarioInternoService);
    repository.buscarPorId.mockResolvedValue({ usuario: criarUsuarioFake(), papel: 'consultor' });
    repository.atualizar.mockImplementation(async (_id, dados) =>
      criarUsuarioFake({ nome: dados.nome ?? 'Maria Silva', ativo: dados.ativo ?? true }),
    );
    hash.make.mockResolvedValue('hash-novo');
  });

  it('atualiza os dados informados, com hash da senha', async () => {
    const resultado = await service.execute(12n, {
      nome: 'Maria Souza',
      telefone: '11888887777',
      documento: '98765432100',
      tipo_pessoa: 'J',
      senha: 'nova-senha',
      ativo: false,
    });

    expect(repository.atualizar).toHaveBeenCalledWith(12n, {
      nome: 'Maria Souza',
      telefone: '11888887777',
      documento: '98765432100',
      tipoPessoa: 'J',
      senha: 'hash-novo',
      ativo: false,
    });
    expect(resultado).toMatchObject({ nome: 'Maria Souza', ativo: false, papel: 'consultor' });
  });

  it('só inativa quando vem apenas ativo', async () => {
    await service.execute(12n, { ativo: false });

    expect(repository.atualizar).toHaveBeenCalledWith(12n, { ativo: false });
    expect(hash.make).not.toHaveBeenCalled();
  });

  it('nunca repassa e-mail ao repositório, mesmo se chegar no objeto', async () => {
    await service.execute(12n, {
      nome: 'Maria',
      email: 'outro@letscom.com',
    } as unknown as AtualizarUsuarioInternoDto);

    expect(repository.atualizar).toHaveBeenCalledWith(12n, { nome: 'Maria' });
  });

  it('limpa o documento quando vem null', async () => {
    await service.execute(12n, { documento: null });

    expect(repository.atualizar).toHaveBeenCalledWith(12n, { documento: null });
  });

  it('lança 404 quando não é usuário interno', async () => {
    repository.buscarPorId.mockResolvedValue(null);

    await expect(service.execute(99n, { nome: 'X' })).rejects.toBeInstanceOf(
      UsuarioInternoNaoEncontradoException,
    );
    expect(repository.atualizar).not.toHaveBeenCalled();
  });

  it('converte telefone duplicado em 409', async () => {
    repository.atualizar.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('dup', {
        code: 'P2002',
        clientVersion: 'test',
        meta: { target: 'users_telefone_key' },
      }),
    );

    await expect(service.execute(12n, { telefone: '11888887777' })).rejects.toMatchObject({
      message: 'Já existe um usuário com este telefone.',
      status: HttpStatus.CONFLICT,
    });
  });
});
