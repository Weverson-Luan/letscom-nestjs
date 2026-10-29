/**
 * IMPORTS
 */

// shared / prisma (conexão com o banco)
import { PrismaService } from 'src/shared/prisma/prisma.service';

// repositories
import { CriarUsuarioAtendimentoRepository } from '../repositories/criar-usuario-atendimento.repository';

describe('CriarUsuarioAtendimentoRepository', () => {
  const montarCliente = () => ({
    user: { findFirst: jest.fn() },
    userAtendimento: { create: jest.fn() },
  });
  const prisma = montarCliente();
  const transacao = montarCliente();
  const repository = new CriarUsuarioAtendimentoRepository(prisma as unknown as PrismaService);

  beforeEach(() => jest.clearAllMocks());

  it('busca o usuário dono ignorando os excluídos', async () => {
    await repository.buscarUsuarioNaoExcluido(7n);

    expect(prisma.user.findFirst).toHaveBeenCalledWith({ where: { id: 7n, deletedAt: null } });
  });

  it('cria na transação recebida devolvendo o usuário dono', async () => {
    const dadosCriacao = { email: 'a@a.com', telefone: '1', user: { connect: { id: 7n } } };

    await repository.criar(dadosCriacao, transacao as never);

    expect(transacao.userAtendimento.create).toHaveBeenCalledWith({
      data: dadosCriacao,
      include: { user: { select: { id: true, nome: true, email: true } } },
    });
    expect(prisma.userAtendimento.create).not.toHaveBeenCalled();
  });
});
