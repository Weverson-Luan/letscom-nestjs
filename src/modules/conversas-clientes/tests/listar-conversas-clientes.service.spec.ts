import { Test } from '@nestjs/testing';
import { ClienteResumoAnotacoesRepository } from '../repositories/cliente-resumo-anotacoes.repository';
import { ListarClientesAnotacoesService } from '../services/listar-clientes-anotacoes.service';
import { criarLinhaResumoFake } from './fixtures';

describe('ListarClientesAnotacoesService', () => {
  const repository = { paginar: jest.fn() };
  let service: ListarClientesAnotacoesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ListarClientesAnotacoesService,
        { provide: ClienteResumoAnotacoesRepository, useValue: repository },
      ],
    }).compile();
    service = moduleRef.get(ListarClientesAnotacoesService);
    repository.paginar.mockResolvedValue({ data: [criarLinhaResumoFake()], total: 11 });
  });

  it('pagina, busca e mapeia os clientes', async () => {
    const resultado = await service.execute({ page: '2', search: ' empresa ' });

    expect(repository.paginar).toHaveBeenCalledWith({ search: 'empresa', skip: 10, take: 10 });
    expect(resultado.data).toEqual([
      expect.objectContaining({ id: 5n, ativo: true, total_anotacoes: 3 }),
    ]);
    expect(resultado.pagination).toEqual({
      current_page: 2,
      last_page: 2,
      per_page: 10,
      total: 11,
    });
  });

  it('ignora busca em branco', async () => {
    await service.execute({ search: '   ' });

    expect(repository.paginar).toHaveBeenCalledWith({ search: undefined, skip: 0, take: 10 });
  });
});
