import { PrismaService } from 'src/shared/prisma/prisma.service';
import { ListarUsuariosClienteRepository } from '../repositories/listar-usuarios-cliente.repository';

describe('ListarUsuariosClienteRepository', () => {
  const prisma = { userCliente: { findMany: jest.fn() } };
  const repository = new ListarUsuariosClienteRepository(prisma as unknown as PrismaService);

  it('lista ordenando pelo id mais recente', async () => {
    await repository.listarTodos();

    expect(prisma.userCliente.findMany).toHaveBeenCalledWith({ orderBy: { id: 'desc' } });
  });
});
