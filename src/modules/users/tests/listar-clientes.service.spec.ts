import { Test } from '@nestjs/testing';
import { UsersResponseMapper } from '../mappers/users-response.mapper';
import { ListarClientesRepository } from '../repositories/listar-clientes.repository';
import { ListarClientesService } from '../services/listar-clientes.service';

describe('ListarClientesService', () => {
  let service: ListarClientesService;
  const repository = { paginar: jest.fn() };
  const mapper = { mapUsersList: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ListarClientesService,
        { provide: ListarClientesRepository, useValue: repository },
        { provide: UsersResponseMapper, useValue: mapper },
      ],
    }).compile();

    service = moduleRef.get(ListarClientesService);
  });

  it('pagina os clientes com ordenação padrão e mapeia a resposta', async () => {
    repository.paginar.mockResolvedValue({ data: [{ id: BigInt(1) }], total: 1 });
    mapper.mapUsersList.mockResolvedValue([{ id: 1 }]);

    const resultado = await service.execute({ page: '1', per_page: '10' });

    expect(repository.paginar).toHaveBeenCalledWith(
      expect.objectContaining({ sortBy: 'createdAt', order: 'desc', skip: 0, take: 10 }),
    );
    expect(resultado.data).toEqual([{ id: 1 }]);
    expect(resultado.pagination).toEqual(expect.objectContaining({ total: 1 }));
  });

  it('repassa busca e ordenação informadas', async () => {
    repository.paginar.mockResolvedValue({ data: [], total: 0 });
    mapper.mapUsersList.mockResolvedValue([]);

    await service.execute({ search: 'xyz', sort_by: 'nome', order: 'asc' });

    expect(repository.paginar).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'xyz', sortBy: 'nome', order: 'asc' }),
    );
  });
});
