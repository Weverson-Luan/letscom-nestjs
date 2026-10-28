import { PrismaService } from 'src/shared/prisma/prisma.service';
import { BuscarUsuarioRepository } from '../repositories/buscar-usuario.repository';

describe('BuscarUsuarioRepository', () => {
  const prisma = { user: { findUnique: jest.fn() } };
  const repository = new BuscarUsuarioRepository(prisma as unknown as PrismaService);

  it('busca o usuário com modelos técnicos e tipo de entrega', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 5n });

    await expect(repository.buscarPorIdComTipoEntrega(5n)).resolves.toEqual({ id: 5n });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 5n },
      include: {
        modelosTecnicos: true,
        tiposEntregaUser: { include: { tipoEntrega: true } },
      },
    });
  });
});
