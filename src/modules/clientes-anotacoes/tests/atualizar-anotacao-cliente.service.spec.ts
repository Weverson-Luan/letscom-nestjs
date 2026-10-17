import { Test } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { AnotacaoClienteInvalidaException } from '../exceptions/anotacao-cliente-invalida.exception';
import { AnotacaoClienteNaoEncontradaException } from '../exceptions/anotacao-cliente-nao-encontrada.exception';
import { SemPermissaoAnotacaoClienteException } from '../exceptions/sem-permissao-anotacao-cliente.exception';
import { ClienteAnotacaoRepository } from '../repositories/cliente-anotacao.repository';
import { AtualizarAnotacaoClienteService } from '../services/atualizar-anotacao-cliente.service';
import { criarAnexoFake, criarAnotacaoFake, criarUsuarioLogadoFake } from './fixtures';

describe('AtualizarAnotacaoClienteService', () => {
  const repository = { buscarPorId: jest.fn(), atualizar: jest.fn() };
  const usuario = criarUsuarioLogadoFake();
  let service: AtualizarAnotacaoClienteService;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-10-16T10:00:00.000Z'));
    const moduleRef = await Test.createTestingModule({
      providers: [
        AtualizarAnotacaoClienteService,
        { provide: ClienteAnotacaoRepository, useValue: repository },
      ],
    }).compile();
    service = moduleRef.get(AtualizarAnotacaoClienteService);
    repository.buscarPorId.mockResolvedValue(criarAnotacaoFake());
    repository.atualizar.mockResolvedValue(
      criarAnotacaoFake({ conteudo: 'Novo', editadaEm: new Date() }),
    );
  });

  afterEach(() => jest.useRealTimers());

  it('atualiza texto e tipo do autor e marca editada_em', async () => {
    const resultado = await service.execute(
      5n,
      30n,
      { conteudo: ' Novo ', tipo: 'email' },
      usuario,
    );

    expect(repository.buscarPorId).toHaveBeenCalledWith(5n, 30n);
    expect(repository.atualizar).toHaveBeenCalledWith(30n, {
      conteudo: 'Novo',
      tipo: 'email',
      editadaEm: new Date('2026-10-16T10:00:00.000Z'),
    });
    expect(resultado).toMatchObject({ conteudo: 'Novo', editada: true });
  });

  it('não grava nada quando o corpo vem vazio', async () => {
    const resultado = await service.execute(5n, 30n, {}, usuario);

    expect(repository.atualizar).not.toHaveBeenCalled();
    expect(resultado).toMatchObject({ id: 30n, editada: false });
  });

  it('permite apagar o texto quando a anotação tem anexo', async () => {
    repository.buscarPorId.mockResolvedValue(criarAnotacaoFake({ anexos: [criarAnexoFake()] }));

    await service.execute(5n, 30n, { conteudo: '  ' }, usuario);

    expect(repository.atualizar).toHaveBeenCalledWith(
      30n,
      expect.objectContaining({ conteudo: '' }),
    );
  });

  it('recusa texto vazio quando não há anexo', async () => {
    await expect(service.execute(5n, 30n, { conteudo: '' }, usuario)).rejects.toBeInstanceOf(
      AnotacaoClienteInvalidaException,
    );
    expect(repository.atualizar).not.toHaveBeenCalled();
  });

  it('lança 404 quando a anotação não existe para o cliente', async () => {
    repository.buscarPorId.mockResolvedValue(null);

    await expect(service.execute(5n, 30n, { conteudo: 'x' }, usuario)).rejects.toBeInstanceOf(
      AnotacaoClienteNaoEncontradaException,
    );
  });

  it('lança 403 quando quem edita não é o autor, mesmo sendo admin', async () => {
    const admin = criarUsuarioLogadoFake({ id: 99n, roles: ['admin'] });

    const promessa = service.execute(5n, 30n, { conteudo: 'x' }, admin);

    await expect(promessa).rejects.toBeInstanceOf(SemPermissaoAnotacaoClienteException);
    await expect(promessa).rejects.toMatchObject({ status: HttpStatus.FORBIDDEN });
    expect(repository.atualizar).not.toHaveBeenCalled();
  });
});
