import { PrismaService } from 'src/shared/prisma/prisma.service';
import { AtualizarUsuarioRepository } from '../repositories/atualizar-usuario.repository';

describe('AtualizarUsuarioRepository', () => {
  const prisma = {
    user: { findUnique: jest.fn(), update: jest.fn() },
    tipoEntregaUser: { deleteMany: jest.fn(), create: jest.fn() },
  };
  const repository = new AtualizarUsuarioRepository(prisma as unknown as PrismaService);

  beforeEach(() => jest.clearAllMocks());

  it('busca e atualiza o usuário por id', async () => {
    await repository.buscarPorId(5n);
    await repository.atualizar(5n, { nome: 'Novo' });

    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 5n } });
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 5n }, data: { nome: 'Novo' } });
  });

  it('substitui o tipo de entrega removendo o vínculo anterior antes de criar o novo', async () => {
    const ordem: string[] = [];
    prisma.tipoEntregaUser.deleteMany.mockImplementation(async () => ordem.push('remove'));
    prisma.tipoEntregaUser.create.mockImplementation(async () => ordem.push('cria'));

    await repository.substituirTipoEntrega(5n, 9n);

    expect(prisma.tipoEntregaUser.deleteMany).toHaveBeenCalledWith({ where: { clienteId: 5n } });
    expect(prisma.tipoEntregaUser.create).toHaveBeenCalledWith({
      data: { clienteId: 5n, tipoEntregaId: 9n },
    });
    expect(ordem).toEqual(['remove', 'cria']);
  });
});
