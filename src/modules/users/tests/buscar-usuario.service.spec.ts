import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UsersResponseMapper } from '../mappers/users-response.mapper';
import { BuscarUsuarioRepository } from '../repositories/buscar-usuario.repository';
import { BuscarUsuarioService } from '../services/buscar-usuario.service';

describe('BuscarUsuarioService', () => {
  let service: BuscarUsuarioService;
  const repository = { buscarPorIdComTipoEntrega: jest.fn() };
  const mapper = { mapSingleUser: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        BuscarUsuarioService,
        { provide: BuscarUsuarioRepository, useValue: repository },
        { provide: UsersResponseMapper, useValue: mapper },
      ],
    }).compile();

    service = moduleRef.get(BuscarUsuarioService);
  });

  it('retorna o usuário mapeado', async () => {
    const usuario = { id: BigInt(3) };
    repository.buscarPorIdComTipoEntrega.mockResolvedValue(usuario);
    mapper.mapSingleUser.mockReturnValue({ id: 3 });

    await expect(service.execute(BigInt(3))).resolves.toEqual({ id: 3 });
    expect(mapper.mapSingleUser).toHaveBeenCalledWith(usuario);
  });

  it('lança 404 quando o usuário não existe', async () => {
    repository.buscarPorIdComTipoEntrega.mockResolvedValue(null);

    await expect(service.execute(BigInt(3))).rejects.toBeInstanceOf(NotFoundException);
    expect(mapper.mapSingleUser).not.toHaveBeenCalled();
  });
});
