/**
 * IMPORTS
 */

// shared / prisma (conexão com o banco)
import { PrismaService } from 'src/shared/prisma/prisma.service';

// repositories
import { CriarUsuarioInternoRepository } from '../repositories/criar-usuario-interno.repository';

describe('CriarUsuarioInternoRepository', () => {
  const montarCliente = () => ({
    role: { findUnique: jest.fn() },
    user: { create: jest.fn() },
  });
  const prisma = montarCliente();
  const transacao = montarCliente();
  const repository = new CriarUsuarioInternoRepository(prisma as unknown as PrismaService);

  beforeEach(() => jest.clearAllMocks());

  it('busca o id do papel pelo nome', async () => {
    prisma.role.findUnique.mockResolvedValue({ id: 3n });

    await expect(repository.buscarIdPapel('producao')).resolves.toEqual({ id: 3n });
    expect(prisma.role.findUnique).toHaveBeenCalledWith({
      where: { nome: 'producao' },
      select: { id: true },
    });
  });

  it('busca o papel e cria o usuário na transação recebida', async () => {
    const dadosCriacao = {
      nome: 'Maria',
      email: 'maria@letscom.com',
      senha: 'hash',
      telefone: '1',
      tipoPessoa: 'F' as const,
    };

    await repository.buscarIdPapel('consultor', transacao as never);
    await repository.criar(dadosCriacao, transacao as never);

    expect(transacao.role.findUnique).toHaveBeenCalled();
    expect(transacao.user.create).toHaveBeenCalledWith({ data: dadosCriacao });
    expect(prisma.role.findUnique).not.toHaveBeenCalled();
    expect(prisma.user.create).not.toHaveBeenCalled();
  });
});
