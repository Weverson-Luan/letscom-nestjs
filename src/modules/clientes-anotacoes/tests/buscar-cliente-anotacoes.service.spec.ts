import { Test } from '@nestjs/testing';
import { ClienteNaoEncontradoException } from '../exceptions/cliente-nao-encontrado.exception';
import { ClienteResumoAnotacoesRepository } from '../repositories/cliente-resumo-anotacoes.repository';
import { BuscarClienteAnotacoesService } from '../services/buscar-cliente-anotacoes.service';
import { criarLinhaResumoFake } from './fixtures';

describe('BuscarClienteAnotacoesService', () => {
  const repository = { buscarPorId: jest.fn() };
  let service: BuscarClienteAnotacoesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        BuscarClienteAnotacoesService,
        { provide: ClienteResumoAnotacoesRepository, useValue: repository },
      ],
    }).compile();
    service = moduleRef.get(BuscarClienteAnotacoesService);
  });

  it('devolve o resumo do cliente', async () => {
    repository.buscarPorId.mockResolvedValue(criarLinhaResumoFake());

    await expect(service.execute(5n)).resolves.toMatchObject({ id: 5n, nome: 'Empresa X' });
    expect(repository.buscarPorId).toHaveBeenCalledWith(5n);
  });

  it('lança 404 quando não é cliente ativo', async () => {
    repository.buscarPorId.mockResolvedValue(null);

    await expect(service.execute(5n)).rejects.toBeInstanceOf(ClienteNaoEncontradoException);
  });
});
