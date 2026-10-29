/**
 * IMPORTS
 */

// shared / prisma (conexão com o banco)
import { PrismaService } from 'src/shared/prisma/prisma.service';

// repositories
import { EnviarFotosRemessaRepository } from '../repositories/enviar-fotos-remessa.repository';

describe('EnviarFotosRemessaRepository', () => {
  const montarCliente = () => ({
    remessa: { findUnique: jest.fn() },
    remessaFoto: { create: jest.fn() },
  });
  const prisma = montarCliente();
  const transacao = montarCliente();
  const repository = new EnviarFotosRemessaRepository(prisma as unknown as PrismaService);

  beforeEach(() => jest.clearAllMocks());

  it('busca só o cliente da remessa', async () => {
    await repository.buscarClienteDaRemessa(10n);

    expect(prisma.remessa.findUnique).toHaveBeenCalledWith({
      where: { id: 10n },
      select: { clienteId: true },
    });
  });

  it('registra a foto na transação recebida', async () => {
    const dadosFoto = { remessaId: 10n, clienteId: 5n, filePath: 'remessas/fotos/10/1.jpg' };

    await repository.registrarFoto(dadosFoto, transacao as never);

    expect(transacao.remessaFoto.create).toHaveBeenCalledWith({ data: dadosFoto });
    expect(prisma.remessaFoto.create).not.toHaveBeenCalled();
  });
});
