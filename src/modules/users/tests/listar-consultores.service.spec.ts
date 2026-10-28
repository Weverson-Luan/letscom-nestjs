import { Test } from '@nestjs/testing';
import { ListarConsultoresRepository } from '../repositories/listar-consultores.repository';
import { ListarConsultoresService } from '../services/listar-consultores.service';

describe('ListarConsultoresService', () => {
  let service: ListarConsultoresService;
  const repository = { paginar: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ListarConsultoresService,
        { provide: ListarConsultoresRepository, useValue: repository },
      ],
    }).compile();

    service = moduleRef.get(ListarConsultoresService);
  });

  it('pagina os consultores com ordenação padrão', async () => {
    repository.paginar.mockResolvedValue({ data: [{ id: BigInt(2) }], total: 1 });

    const resultado = await service.execute({});

    expect(repository.paginar).toHaveBeenCalledWith(
      expect.objectContaining({ sortBy: 'createdAt', order: 'desc', skip: 0, take: 10 }),
    );
    expect(resultado.data).toEqual([{ id: BigInt(2) }]);
    expect(resultado.pagination).toEqual(expect.objectContaining({ total: 1 }));
  });

  it('retorna lista vazia quando não há consultores', async () => {
    repository.paginar.mockResolvedValue({ data: [], total: 0 });

    const resultado = await service.execute({ search: 'ninguem' });

    expect(resultado.data).toEqual([]);
    expect(resultado.pagination).toEqual(expect.objectContaining({ total: 0 }));
  });
});
