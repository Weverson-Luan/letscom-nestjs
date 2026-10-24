import { RemessaLiberadaClienteService } from '../services/remessa-liberada-cliente.service';

jest.mock('crypto', () => ({ ...jest.requireActual('crypto'), randomUUID: () => 'uuid-fixo' }));
jest.mock('../mappers/remessa-liberada.mapper', () => ({
  mapRemessaLiberadaCliente: (registro: unknown) => registro,
}));

describe('RemessaLiberadaClienteService — arquivo na pasta raiz do storage', () => {
  const prisma = {
    remessa: { findFirst: jest.fn() },
    user: { findUnique: jest.fn() },
  };
  const repository = { create: jest.fn() };
  const storage = {
    put: jest.fn(),
    montarCaminho: jest.fn((relativo: string) => `homologacao/${relativo}`),
  };
  let service: RemessaLiberadaClienteService;

  const dto = { remessa_id: 10, tipo_entrega_id: 2 };
  const usuario = { id: 7n };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.remessa.findFirst.mockResolvedValue({ id: 10n });
    prisma.user.findUnique.mockResolvedValue({ id: 7n });
    repository.create.mockImplementation((data: unknown) => Promise.resolve(data));
    service = new RemessaLiberadaClienteService(
      prisma as never,
      repository as never,
      storage as never,
    );
  });

  it('grava o arquivo do cliente dentro da pasta raiz e persiste o mesmo caminho', async () => {
    const arquivo = { buffer: Buffer.from('pdf'), originalname: 'Comprovante.PDF' };

    await service.liberarRemessaParaCliente(dto as never, usuario as never, arquivo);

    const caminho = 'homologacao/remessas-liberadas-cliente/10/file/uuid-fixo.pdf';
    expect(storage.montarCaminho).toHaveBeenCalledWith(
      'remessas-liberadas-cliente/10/file/uuid-fixo.pdf',
    );
    expect(storage.put).toHaveBeenCalledWith(caminho, arquivo.buffer);
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ filePath: caminho }));
  });

  it('sem arquivo não toca no storage e persiste filePath nulo', async () => {
    await service.liberarRemessaParaCliente(dto as never, usuario as never);

    expect(storage.put).not.toHaveBeenCalled();
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ filePath: null }));
  });
});
