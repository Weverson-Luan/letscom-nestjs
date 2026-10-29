/**
 * IMPORTS
 */

// shared / prisma (conexão com o banco)
import { PrismaService } from 'src/shared/prisma/prisma.service';

// repositories
import { ExcluirUsuarioAtendimentoRepository } from '../repositories/excluir-usuario-atendimento.repository';

describe('ExcluirUsuarioAtendimentoRepository', () => {
  const montarCliente = () => ({ userAtendimento: { delete: jest.fn() } });
  const prisma = montarCliente();
  const transacao = montarCliente();
  const repository = new ExcluirUsuarioAtendimentoRepository(prisma as unknown as PrismaService);

  beforeEach(() => jest.clearAllMocks());

  it('exclui fisicamente na transação recebida', async () => {
    await repository.excluir(4n, transacao as never);

    expect(transacao.userAtendimento.delete).toHaveBeenCalledWith({ where: { id: 4n } });
    expect(prisma.userAtendimento.delete).not.toHaveBeenCalled();
  });
});
