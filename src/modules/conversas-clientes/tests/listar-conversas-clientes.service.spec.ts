import { Test } from '@nestjs/testing';
import { ConversaClienteResumoRepository } from '../repositories/conversa-cliente-resumo.repository';
import { ListarConversasClientesService } from '../services/listar-conversas-clientes.service';
import { criarLinhaResumoFake } from './fixtures';

describe('ListarConversasClientesService', () => {
  const repository = { paginar: jest.fn() };
  let service: ListarConversasClientesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ListarConversasClientesService,
        { provide: ConversaClienteResumoRepository, useValue: repository },
      ],
    }).compile();
    service = moduleRef.get(ListarConversasClientesService);
    repository.paginar.mockResolvedValue({ data: [criarLinhaResumoFake()], total: 11 });
  });

  it('pagina, busca e mapeia os clientes', async () => {
    const resultado = await service.execute({ page: '2', search: ' empresa ' });

    expect(repository.paginar).toHaveBeenCalledWith({ search: 'empresa', skip: 10, take: 10 });
    expect(resultado.data).toEqual([
      expect.objectContaining({ id: 5n, ativo: true, total_mensagens: 3 }),
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
