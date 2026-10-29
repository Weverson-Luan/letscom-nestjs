import { Test } from '@nestjs/testing';
import { ListarUsuariosClienteRepository } from '../repositories/listar-usuarios-cliente.repository';
import { ListarUsuariosClienteService } from '../services/listar-usuarios-cliente.service';

describe('ListarUsuariosClienteService', () => {
  let service: ListarUsuariosClienteService;
  const repository = { listarTodos: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ListarUsuariosClienteService,
        { provide: ListarUsuariosClienteRepository, useValue: repository },
      ],
    }).compile();

    service = moduleRef.get(ListarUsuariosClienteService);
  });

  it('retorna todos os usuários do repositório', async () => {
    repository.listarTodos.mockResolvedValue([{ id: 2n }, { id: 1n }]);

    await expect(service.execute()).resolves.toEqual([{ id: 2n }, { id: 1n }]);
  });

  it('retorna lista vazia quando não há usuários', async () => {
    repository.listarTodos.mockResolvedValue([]);

    await expect(service.execute()).resolves.toEqual([]);
  });
});
