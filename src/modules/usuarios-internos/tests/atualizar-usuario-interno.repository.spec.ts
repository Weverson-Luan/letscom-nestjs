/**
 * IMPORTS
 */

// shared / prisma (conexão com o banco)
import { PrismaService } from 'src/shared/prisma/prisma.service';

// repositories
import { AtualizarUsuarioInternoRepository } from '../repositories/atualizar-usuario-interno.repository';

describe('AtualizarUsuarioInternoRepository', () => {
  const montarCliente = () => ({ user: { update: jest.fn() } });
  const prisma = montarCliente();
  const transacao = montarCliente();
  const repository = new AtualizarUsuarioInternoRepository(prisma as unknown as PrismaService);

  beforeEach(() => jest.clearAllMocks());

  it('atualiza na transação recebida', async () => {
    await repository.atualizar(12n, { nome: 'Maria' }, transacao as never);

    expect(transacao.user.update).toHaveBeenCalledWith({
      where: { id: 12n },
      data: { nome: 'Maria' },
    });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('atualiza com o client padrão sem transação', async () => {
    await repository.atualizar(12n, { ativo: false });

    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 12n }, data: { ativo: false } });
  });
});
