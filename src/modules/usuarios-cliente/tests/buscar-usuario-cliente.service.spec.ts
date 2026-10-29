/**
 * IMPORTS
 */
import { Test } from '@nestjs/testing';

// repositories
import { BuscarUsuarioClienteRepository } from '../repositories/buscar-usuario-cliente.repository';

// services
import { BuscarUsuarioClienteService } from '../services/buscar-usuario-cliente.service';

describe('BuscarUsuarioClienteService', () => {
  let service: BuscarUsuarioClienteService;
  const repository = { buscarPorId: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        BuscarUsuarioClienteService,
        { provide: BuscarUsuarioClienteRepository, useValue: repository },
      ],
    }).compile();

    service = moduleRef.get(BuscarUsuarioClienteService);
  });

  it('retorna o usuário encontrado', async () => {
    repository.buscarPorId.mockResolvedValue({ id: 3n });

    await expect(service.execute(3n)).resolves.toEqual({ id: 3n });
    expect(repository.buscarPorId).toHaveBeenCalledWith(3n);
  });

  it('retorna null quando o usuário não existe', async () => {
    repository.buscarPorId.mockResolvedValue(null);

    await expect(service.execute(3n)).resolves.toBeNull();
  });
});
