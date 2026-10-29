import { PrismaService } from 'src/shared/prisma/prisma.service';
import { CriarUsuarioClienteRepository } from '../repositories/criar-usuario-cliente.repository';

describe('CriarUsuarioClienteRepository', () => {
  const cliente = () => ({
    userCliente: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
    role: { findFirst: jest.fn() },
  });
  const prisma = cliente();
  const transacao = cliente();
  const repository = new CriarUsuarioClienteRepository(prisma as unknown as PrismaService);

  beforeEach(() => jest.clearAllMocks());

  it('cria o usuário na transação recebida', async () => {
    const data = { email: 'x@x.com', senha: 'hash' };

    await repository.criar(data as never, transacao as never);

    expect(transacao.userCliente.create).toHaveBeenCalledWith({ data });
    expect(prisma.userCliente.create).not.toHaveBeenCalled();
  });

  it('busca duplicidade por e-mail e documento', async () => {
    await repository.buscarPorEmail('x@x.com', transacao as never);
    await repository.buscarPorDocumento('123');

    expect(transacao.userCliente.findUnique).toHaveBeenCalledWith({ where: { email: 'x@x.com' } });
    expect(prisma.userCliente.findFirst).toHaveBeenCalledWith({ where: { documento: '123' } });
  });

  it('busca o papel subordinado com e sem maiúscula', async () => {
    await repository.buscarPapelSubordinado(transacao as never);

    expect(transacao.role.findFirst).toHaveBeenCalledWith({
      where: { nome: { in: ['subordinado', 'Subordinado'] } },
    });
  });
});
