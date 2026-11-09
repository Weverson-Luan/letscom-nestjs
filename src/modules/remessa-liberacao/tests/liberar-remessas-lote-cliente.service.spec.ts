import { LiberarRemessasLoteClienteService } from '../services/liberar-remessas-lote-cliente.service';

describe('LiberarRemessasLoteClienteService — cache das listagens', () => {
  const transacao = {
    remessaLiberadaCliente: { createMany: jest.fn() },
    remessa: { updateMany: jest.fn() },
  };
  const prisma = {
    remessa: { findMany: jest.fn() },
    tipoEntregaUser: { findMany: jest.fn() },
    user: { findUnique: jest.fn() },
    $transaction: jest.fn((callback: (transacaoMock: typeof transacao) => unknown) =>
      callback(transacao),
    ),
  };
  const repository = { findRemessaIdsLiberadas: jest.fn() };
  const balcaoRepository = { findRemessaIdsLiberadas: jest.fn() };
  const remessasCache = { invalidarTudoDosClientes: jest.fn() };
  let service: LiberarRemessasLoteClienteService;

  const usuario = { id: 1n, roles: ['recepcao'] };

  const criarRemessa = (id: bigint, clienteId: bigint) => ({
    id,
    numeroRemessa: `R${id}`,
    clienteId,
    status: 'pedido_liberado',
    situacao: 'pedido_liberado',
    cliente: { nome: `Cliente ${clienteId}` },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.user.findUnique.mockResolvedValue({ id: 1n, nome: 'Recepção' });
    prisma.tipoEntregaUser.findMany.mockResolvedValue([
      { clienteId: 100n, tipoEntregaId: 2n },
      { clienteId: 200n, tipoEntregaId: 2n },
    ]);
    repository.findRemessaIdsLiberadas.mockResolvedValue([]);
    balcaoRepository.findRemessaIdsLiberadas.mockResolvedValue([
      { remessaId: 1n },
      { remessaId: 2n },
      { remessaId: 3n },
    ]);
    service = new LiberarRemessasLoteClienteService(
      prisma as never,
      repository as never,
      balcaoRepository as never,
      remessasCache as never,
    );
  });

  it('invalida o cache dos clientes das remessas liberadas', async () => {
    prisma.remessa.findMany.mockResolvedValue([
      criarRemessa(1n, 100n),
      criarRemessa(2n, 100n),
      criarRemessa(3n, 200n),
    ]);

    await service.liberarEmLote({ remessa_ids: [1, 2, 3] } as never, usuario as never);

    expect(transacao.remessaLiberadaCliente.createMany).toHaveBeenCalled();
    expect(remessasCache.invalidarTudoDosClientes).toHaveBeenCalledWith([100, 100, 200]);
  });

  it('não invalida o cache quando o lote é recusado na validação', async () => {
    prisma.remessa.findMany.mockResolvedValue([]);

    await expect(
      service.liberarEmLote({ remessa_ids: [1] } as never, usuario as never),
    ).rejects.toThrow();
    expect(remessasCache.invalidarTudoDosClientes).not.toHaveBeenCalled();
  });
});
