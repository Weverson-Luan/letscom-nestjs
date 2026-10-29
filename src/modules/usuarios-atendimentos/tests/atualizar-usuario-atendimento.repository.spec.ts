/**
 * IMPORTS
 */

// shared / prisma (conexão com o banco)
import { PrismaService } from 'src/shared/prisma/prisma.service';

// repositories
import { AtualizarUsuarioAtendimentoRepository } from '../repositories/atualizar-usuario-atendimento.repository';

describe('AtualizarUsuarioAtendimentoRepository', () => {
  const montarCliente = () => ({ userAtendimento: { update: jest.fn() } });
  const prisma = montarCliente();
  const transacao = montarCliente();
  const repository = new AtualizarUsuarioAtendimentoRepository(prisma as unknown as PrismaService);

  beforeEach(() => jest.clearAllMocks());

  it('atualiza devolvendo o usuário dono', async () => {
    await repository.atualizar(4n, { nome: 'Novo' });

    expect(prisma.userAtendimento.update).toHaveBeenCalledWith({
      where: { id: 4n },
      data: { nome: 'Novo' },
      include: { user: { select: { id: true, nome: true, email: true } } },
    });
  });

  it('usa a transação recebida', async () => {
    await repository.atualizar(4n, { nome: 'Novo' }, transacao as never);

    expect(transacao.userAtendimento.update).toHaveBeenCalled();
    expect(prisma.userAtendimento.update).not.toHaveBeenCalled();
  });
});
