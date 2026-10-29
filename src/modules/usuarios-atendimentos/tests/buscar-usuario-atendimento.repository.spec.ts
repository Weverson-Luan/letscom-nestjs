/**
 * IMPORTS
 */

// shared / prisma (conexão com o banco)
import { PrismaService } from 'src/shared/prisma/prisma.service';

// repositories
import { BuscarUsuarioAtendimentoRepository } from '../repositories/buscar-usuario-atendimento.repository';

describe('BuscarUsuarioAtendimentoRepository', () => {
  const montarCliente = () => ({ userAtendimento: { findUnique: jest.fn() } });
  const prisma = montarCliente();
  const transacao = montarCliente();
  const repository = new BuscarUsuarioAtendimentoRepository(prisma as unknown as PrismaService);

  beforeEach(() => jest.clearAllMocks());

  it('busca por id com o usuário dono', async () => {
    await repository.buscarPorIdComUsuario(3n);

    expect(prisma.userAtendimento.findUnique).toHaveBeenCalledWith({
      where: { id: 3n },
      include: { user: { select: { id: true, nome: true, email: true } } },
    });
    expect(transacao.userAtendimento.findUnique).not.toHaveBeenCalled();
  });
});
