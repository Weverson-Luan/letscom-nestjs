import { SolicitacaoRemessaService } from '../services/solicitacao-remessa.service';

describe('SolicitacaoRemessaService — status inicial', () => {
  const tx = {
    remessaResponsabilidade: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
  };
  const prisma = {
    $transaction: jest.fn((fn: (client: typeof tx) => Promise<unknown>) => fn(tx)),
  };
  const remessaService = { solicitarRemessa: jest.fn() };
  const remessaRepository = { findById: jest.fn() };
  const statusService = { registrarStatusTx: jest.fn() };
  const storage = { delete: jest.fn(), deleteDirectory: jest.fn() };
  const cache = { invalidarTudo: jest.fn() };

  const dadosBase = {
    cliente_id: '1',
    status: 'envio_de_dados',
    nome: 'João Silva',
    documento: '12345678901',
  };

  let service: SolicitacaoRemessaService;

  beforeEach(() => {
    jest.clearAllMocks();
    remessaService.solicitarRemessa.mockResolvedValue({ id: BigInt(10), clienteId: BigInt(1) });
    tx.remessaResponsabilidade.findFirst.mockResolvedValue(null);
    remessaRepository.findById.mockResolvedValue({ id: BigInt(10) });
    service = new SolicitacaoRemessaService(
      prisma as never,
      remessaService as never,
      remessaRepository as never,
      statusService as never,
      storage as never,
      cache as never,
    );
  });

  it('registra o solicitante (users) como autor do status inicial', async () => {
    await service.executar({ ...dadosBase, user_id_solicitante_remessa: '2' });

    expect(statusService.registrarStatusTx).toHaveBeenCalledWith(
      tx,
      BigInt(10),
      'envio_de_dados',
      BigInt(2),
    );
  });

  it('registra autor nulo quando quem solicitou foi um subordinado do portal', async () => {
    await service.executar({ ...dadosBase, users_solicitante_subordinado_id: '5' });

    expect(statusService.registrarStatusTx).toHaveBeenCalledWith(
      tx,
      BigInt(10),
      'envio_de_dados',
      null,
    );
  });
});
