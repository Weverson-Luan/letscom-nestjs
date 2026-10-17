import { Test } from '@nestjs/testing';
import { AnotacaoClienteNaoEncontradaException } from '../exceptions/anotacao-cliente-nao-encontrada.exception';
import { SemPermissaoAnotacaoClienteException } from '../exceptions/sem-permissao-anotacao-cliente.exception';
import { ClienteAnotacaoRepository } from '../repositories/cliente-anotacao.repository';
import { RemoverAnotacaoClienteService } from '../services/remover-anotacao-cliente.service';
import { criarAnotacaoFake, criarUsuarioLogadoFake } from './fixtures';

describe('RemoverAnotacaoClienteService', () => {
  const repository = { buscarPorId: jest.fn(), remover: jest.fn() };
  let service: RemoverAnotacaoClienteService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        RemoverAnotacaoClienteService,
        { provide: ClienteAnotacaoRepository, useValue: repository },
      ],
    }).compile();
    service = moduleRef.get(RemoverAnotacaoClienteService);
    repository.buscarPorId.mockResolvedValue(criarAnotacaoFake());
  });

  it('o autor exclui a própria anotação', async () => {
    await service.execute(5n, 30n, criarUsuarioLogadoFake());

    expect(repository.buscarPorId).toHaveBeenCalledWith(5n, 30n);
    expect(repository.remover).toHaveBeenCalledWith(30n);
  });

  it('admin exclui anotação de outro usuário', async () => {
    await service.execute(5n, 30n, criarUsuarioLogadoFake({ id: 99n, roles: ['admin'] }));

    expect(repository.remover).toHaveBeenCalledWith(30n);
  });

  it('lança 403 para quem não é autor nem admin', async () => {
    await expect(
      service.execute(5n, 30n, criarUsuarioLogadoFake({ id: 99n })),
    ).rejects.toBeInstanceOf(SemPermissaoAnotacaoClienteException);
    expect(repository.remover).not.toHaveBeenCalled();
  });

  it('lança 404 quando a anotação não existe', async () => {
    repository.buscarPorId.mockResolvedValue(null);

    await expect(service.execute(5n, 30n, criarUsuarioLogadoFake())).rejects.toBeInstanceOf(
      AnotacaoClienteNaoEncontradaException,
    );
  });
});
