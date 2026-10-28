import { PrismaService } from 'src/shared/prisma/prisma.service';
import { BuscarDadosUsuarioRepository } from '../repositories/buscar-dados-usuario.repository';

describe('BuscarDadosUsuarioRepository', () => {
  const prisma = { remessa: { count: jest.fn() } };
  const repository = new BuscarDadosUsuarioRepository(prisma as unknown as PrismaService);

  beforeEach(() => jest.clearAllMocks());

  it('conta remessas do cliente que não estão concluídas nem canceladas', async () => {
    prisma.remessa.count.mockResolvedValue(4);

    await expect(repository.contarRemessasEmAndamento(10n)).resolves.toBe(4);
    expect(prisma.remessa.count).toHaveBeenCalledWith({
      where: { clienteId: 10n, status: { notIn: ['concluida', 'concluído', 'cancelada'] } },
    });
  });

  it('conta remessas do cliente com pedido liberado', async () => {
    prisma.remessa.count.mockResolvedValue(2);

    await expect(repository.contarRemessasProduzidas(10n)).resolves.toBe(2);
    expect(prisma.remessa.count).toHaveBeenCalledWith({
      where: { clienteId: 10n, status: 'pedido_liberado' },
    });
  });
});
