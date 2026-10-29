/**
 * IMPORTS
 */
import { Test } from '@nestjs/testing';

// repositories
import { ListarUsuariosDoClienteRepository } from '../repositories/listar-usuarios-do-cliente.repository';

// services
import { ListarUsuariosDoClienteService } from '../services/listar-usuarios-do-cliente.service';

describe('ListarUsuariosDoClienteService', () => {
  let service: ListarUsuariosDoClienteService;
  const repository = { paginarPorCliente: jest.fn() };

  const usuario = {
    id: 3n,
    clienteId: 9n,
    email: 'sub@empresa.com',
    nome: 'Sub',
    senha: 'hash',
    documento: '123',
    ativo: true,
    createdAt: null,
    updatedAt: null,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ListarUsuariosDoClienteService,
        { provide: ListarUsuariosDoClienteRepository, useValue: repository },
      ],
    }).compile();

    service = moduleRef.get(ListarUsuariosDoClienteService);
  });

  it('pagina pelo cliente com ordem padrão e mapeia sem expor a senha', async () => {
    repository.paginarPorCliente.mockResolvedValue({ data: [usuario], total: 1 });

    const resultado = await service.execute(9n, { page: '1', per_page: '10' });

    expect(repository.paginarPorCliente).toHaveBeenCalledWith({
      clienteId: 9n,
      busca: undefined,
      campoOrdenacao: undefined,
      direcao: 'desc',
      skip: 0,
      take: 10,
    });
    expect(resultado.data).toEqual([
      {
        id: 3n,
        cliente_id: 9n,
        email: 'sub@empresa.com',
        nome: 'Sub',
        ativo: true,
        created_at: null,
        updated_at: null,
      },
    ]);
    expect(resultado.pagination).toEqual(expect.objectContaining({ total: 1 }));
  });

  it('repassa busca e ordenação informadas', async () => {
    repository.paginarPorCliente.mockResolvedValue({ data: [], total: 0 });

    const resultado = await service.execute(9n, { search: 'xyz', sort_by: 'nome', order: 'asc' });

    expect(repository.paginarPorCliente).toHaveBeenCalledWith(
      expect.objectContaining({ busca: 'xyz', campoOrdenacao: 'nome', direcao: 'asc' }),
    );
    expect(resultado.data).toEqual([]);
  });
});
