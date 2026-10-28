import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ExcluirUsuarioRepository } from '../repositories/excluir-usuario.repository';
import { ExcluirUsuarioService } from '../services/excluir-usuario.service';

describe('ExcluirUsuarioService', () => {
  let service: ExcluirUsuarioService;
  const repository = { buscarPorId: jest.fn(), marcarComoExcluido: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ExcluirUsuarioService,
        { provide: ExcluirUsuarioRepository, useValue: repository },
      ],
    }).compile();

    service = moduleRef.get(ExcluirUsuarioService);
  });

  it('faz soft delete do usuário existente', async () => {
    repository.buscarPorId.mockResolvedValue({ id: BigInt(4) });

    await expect(service.execute(BigInt(4))).resolves.toBe(true);
    expect(repository.marcarComoExcluido).toHaveBeenCalledWith(BigInt(4));
  });

  it('lança 404 quando o usuário não existe', async () => {
    repository.buscarPorId.mockResolvedValue(null);

    await expect(service.execute(BigInt(4))).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.marcarComoExcluido).not.toHaveBeenCalled();
  });
});
