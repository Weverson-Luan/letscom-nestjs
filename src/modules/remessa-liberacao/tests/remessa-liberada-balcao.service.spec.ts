import { RemessaLiberadaBalcaoService } from '../services/remessa-liberada-balcao.service';

jest.mock('../mappers/remessa-liberada.mapper', () => ({
  mapRemessaLiberadaBalcao: (registro: unknown) => registro,
}));

describe('RemessaLiberadaBalcaoService — cache das listagens', () => {
  const prisma = {
    remessa: { findFirst: jest.fn() },
    user: { findUnique: jest.fn() },
  };
  const repository = { create: jest.fn() };
  const emailService = { enviar: jest.fn() };
  const remessasCache = { invalidarTudo: jest.fn() };
  let service: RemessaLiberadaBalcaoService;

  const dto = { remessa_id: 10, tipo_entrega_id: 2 };
  const usuario = { id: 7n, roles: ['expedicao'] };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.remessa.findFirst.mockResolvedValue({ id: 10n, clienteId: 3n, userIdExecutor: null });
    prisma.user.findUnique.mockResolvedValue({ id: 7n, nome: 'Expedidor' });
    repository.create.mockImplementation((data: unknown) => Promise.resolve(data));
    service = new RemessaLiberadaBalcaoService(
      prisma as never,
      repository as never,
      emailService as never,
      remessasCache as never,
    );
  });

  it('invalida o cache das listagens do cliente após liberar', async () => {
    await service.liberarRemessaParaBalcao(dto as never, usuario as never);

    expect(repository.create).toHaveBeenCalled();
    expect(remessasCache.invalidarTudo).toHaveBeenCalledWith(3);
  });

  it('não invalida o cache quando a remessa não existe', async () => {
    prisma.remessa.findFirst.mockResolvedValue(null);

    await expect(service.liberarRemessaParaBalcao(dto as never, usuario as never)).rejects.toThrow(
      'Remessa não encontrada!',
    );
    expect(remessasCache.invalidarTudo).not.toHaveBeenCalled();
  });
});
