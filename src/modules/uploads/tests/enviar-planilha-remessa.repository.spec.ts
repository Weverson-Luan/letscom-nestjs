/**
 * IMPORTS
 */

// shared / prisma (conexão com o banco)
import { PrismaService } from 'src/shared/prisma/prisma.service';

// repositories
import { EnviarPlanilhaRemessaRepository } from '../repositories/enviar-planilha-remessa.repository';

describe('EnviarPlanilhaRemessaRepository', () => {
  const montarCliente = () => ({
    remessa: { findUnique: jest.fn() },
    remessaPlanilha: { create: jest.fn() },
  });
  const prisma = montarCliente();
  const transacao = montarCliente();
  const repository = new EnviarPlanilhaRemessaRepository(prisma as unknown as PrismaService);

  beforeEach(() => jest.clearAllMocks());

  it('busca só o cliente da remessa', async () => {
    await repository.buscarClienteDaRemessa(10n);

    expect(prisma.remessa.findUnique).toHaveBeenCalledWith({
      where: { id: 10n },
      select: { clienteId: true },
    });
  });

  it('registra a planilha na transação recebida', async () => {
    const dadosPlanilha = {
      remessaId: 10n,
      clienteId: 5n,
      filePath: 'remessas/planilhas/10/a.csv',
      tipo: 'csv',
    };

    await repository.registrarPlanilha(dadosPlanilha, transacao as never);

    expect(transacao.remessaPlanilha.create).toHaveBeenCalledWith({ data: dadosPlanilha });
    expect(prisma.remessaPlanilha.create).not.toHaveBeenCalled();
  });
});
