/**
 * IMPORTS
 */

// shared / prisma (conexão com o banco)
import { PrismaService } from 'src/shared/prisma/prisma.service';

// repositories
import { ListarUsuariosAtendimentoRepository } from '../repositories/listar-usuarios-atendimento.repository';

describe('ListarUsuariosAtendimentoRepository', () => {
  const montarCliente = () => ({ userAtendimento: { findMany: jest.fn() } });
  const prisma = montarCliente();
  const transacao = montarCliente();
  const repository = new ListarUsuariosAtendimentoRepository(prisma as unknown as PrismaService);

  beforeEach(() => jest.clearAllMocks());

  it('lista por id asc com o usuário dono', async () => {
    await repository.listarComUsuario();

    expect(prisma.userAtendimento.findMany).toHaveBeenCalledWith({
      include: { user: { select: { id: true, nome: true, email: true } } },
      orderBy: { id: 'asc' },
    });
    expect(transacao.userAtendimento.findMany).not.toHaveBeenCalled();
  });
});
