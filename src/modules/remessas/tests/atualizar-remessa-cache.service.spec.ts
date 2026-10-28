import { RemessaService } from '../services/remessa.service';

describe('RemessaService.updateRemessa — cache das listagens', () => {
  const tx = { remessa: { update: jest.fn() } };
  const prisma = {
    remessa: { findUnique: jest.fn() },
    $transaction: jest.fn((fn: (client: typeof tx) => Promise<unknown>) => fn(tx)),
  };
  const cache = { invalidarTudo: jest.fn() };
  let service: RemessaService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.remessa.findUnique.mockResolvedValue({
      id: BigInt(1193),
      clienteId: BigInt(7),
      situacao: 'em_producao',
      planilhas: [],
      fotos: [],
      modeloTecnico: null,
    });
    service = new RemessaService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      { get: jest.fn() } as never,
      cache as never,
    );
  });

  it('invalida as listagens do cliente após atualizar a situação', async () => {
    await service.updateRemessa(BigInt(1193), { situacao: 'pronto para imprimir' });

    expect(tx.remessa.update).toHaveBeenCalledWith({
      where: { id: BigInt(1193) },
      data: { situacao: 'pronto_para_imprimir' },
    });
    expect(cache.invalidarTudo).toHaveBeenCalledWith(7);
  });

  it('não invalida o cache quando a remessa não existe', async () => {
    prisma.remessa.findUnique.mockResolvedValue(null);

    await expect(service.updateRemessa(BigInt(1), { situacao: 'pendente' })).rejects.toThrow();
    expect(cache.invalidarTudo).not.toHaveBeenCalled();
  });
});
