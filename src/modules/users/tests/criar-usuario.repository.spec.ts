import { PrismaService } from 'src/shared/prisma/prisma.service';
import { CriarUsuarioRepository } from '../repositories/criar-usuario.repository';

describe('CriarUsuarioRepository', () => {
  const cliente = () => ({
    user: { create: jest.fn() },
    clienteConsultor: { create: jest.fn() },
    tipoEntregaUser: { create: jest.fn() },
  });
  const prisma = cliente();
  const transacao = cliente();
  const repository = new CriarUsuarioRepository(prisma as unknown as PrismaService);

  beforeEach(() => jest.clearAllMocks());

  it('cria o usuário na transação recebida', async () => {
    const data = { nome: 'X', email: 'x@x.com', senha: 'hash', telefone: '1' };

    await repository.criar(data as never, transacao as never);

    expect(transacao.user.create).toHaveBeenCalledWith({ data });
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('vincula consultor e tipo de entrega ao cliente', async () => {
    await repository.vincularConsultor(1n, 2n, transacao as never);
    await repository.vincularTipoEntrega(1n, 3n);

    expect(transacao.clienteConsultor.create).toHaveBeenCalledWith({
      data: { clienteId: 1n, consultorId: 2n },
    });
    expect(prisma.tipoEntregaUser.create).toHaveBeenCalledWith({
      data: { clienteId: 1n, tipoEntregaId: 3n },
    });
  });
});
