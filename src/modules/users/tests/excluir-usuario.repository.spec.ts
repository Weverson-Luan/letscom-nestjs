import { PrismaService } from 'src/shared/prisma/prisma.service';
import { ExcluirUsuarioRepository } from '../repositories/excluir-usuario.repository';

describe('ExcluirUsuarioRepository', () => {
  const prisma = { user: { findUnique: jest.fn(), update: jest.fn() } };
  const repository = new ExcluirUsuarioRepository(prisma as unknown as PrismaService);

  beforeEach(() => jest.clearAllMocks());

  it('marca o usuário como excluído preenchendo deleted_at', async () => {
    await repository.marcarComoExcluido(5n);

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 5n },
      data: { deletedAt: expect.any(Date) },
    });
  });

  it('busca o usuário por id', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(repository.buscarPorId(5n)).resolves.toBeNull();
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 5n } });
  });
});
