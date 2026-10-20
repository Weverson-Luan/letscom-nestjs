import { Test } from '@nestjs/testing';
import { ClienteNaoEncontradoException } from '../exceptions/cliente-nao-encontrado.exception';
import { ClienteCompromissoRepository } from '../repositories/cliente-compromisso.repository';
import { ListarCompromissosClienteService } from '../services/listar-compromissos-cliente.service';
import { criarCompromissoFake } from './fixtures';

describe('ListarCompromissosClienteService', () => {
  const repository = { ehClienteAtivo: jest.fn(), paginar: jest.fn() };
  let service: ListarCompromissosClienteService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ListarCompromissosClienteService,
        { provide: ClienteCompromissoRepository, useValue: repository },
      ],
    }).compile();
    service = moduleRef.get(ListarCompromissosClienteService);
    repository.ehClienteAtivo.mockResolvedValue(true);
    repository.paginar.mockResolvedValue({ data: [criarCompromissoFake()], total: 1 });
  });

  it('lista com filtros, paginação padrão de 20 e formato interno', async () => {
    const resultado = await service.execute(5n, {
      status: 'pendente',
      tipo: 'reuniao',
      de: '2026-10-01',
      ate: '2026-10-31',
      search: ' proposta ',
    });

    expect(repository.ehClienteAtivo).toHaveBeenCalledWith(5n);
    expect(repository.paginar).toHaveBeenCalledWith({
      clienteId: 5n,
      status: 'pendente',
      tipo: 'reuniao',
      de: new Date('2026-10-01T00:00:00.000Z'),
      ate: new Date('2026-10-31T23:59:59.999Z'),
      search: 'proposta',
      skip: 0,
      take: 20,
    });
    expect(resultado.data).toEqual([
      expect.objectContaining({
        id: 1n,
        visivel_cliente: true,
        autor: { id: 7n, nome: 'Operador' },
      }),
    ]);
    expect(resultado.pagination).toEqual({ current_page: 1, last_page: 1, per_page: 20, total: 1 });
  });

  it('limita per_page a 50 e calcula o skip da página', async () => {
    repository.paginar.mockResolvedValue({ data: [], total: 120 });

    const resultado = await service.execute(5n, { page: '3', per_page: '500' });

    expect(repository.paginar).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 100, take: 50 }),
    );
    expect(resultado).toEqual({
      data: [],
      pagination: { current_page: 3, last_page: 3, per_page: 50, total: 120 },
    });
  });

  it('lança 404 quando o cliente não está ativo, sem paginar', async () => {
    repository.ehClienteAtivo.mockResolvedValue(false);

    await expect(service.execute(5n, {})).rejects.toBeInstanceOf(ClienteNaoEncontradoException);
    expect(repository.paginar).not.toHaveBeenCalled();
  });
});
