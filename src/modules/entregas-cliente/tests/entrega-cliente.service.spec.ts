import { EntregaClienteService } from '../services/entrega-cliente.service';

jest.mock('crypto', () => ({ ...jest.requireActual('crypto'), randomUUID: () => 'uuid-fixo' }));

describe('EntregaClienteService — protocolo na pasta raiz do storage', () => {
  const repository = { create: jest.fn(), update: jest.fn(), findById: jest.fn() };
  const prisma = { remessa: { findFirst: jest.fn() } };
  const storage = {
    put: jest.fn(),
    montarCaminho: jest.fn((relativo: string) => `homologacao/${relativo}`),
  };
  let service: EntregaClienteService;

  const imagem = {
    buffer: Buffer.from('png'),
    originalname: 'protocolo.png',
    mimetype: 'image/png',
  };
  const caminho = 'homologacao/entregas/protocolos/uuid-fixo.png';

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.remessa.findFirst.mockResolvedValue({ id: 10n });
    repository.findById.mockResolvedValue({ id: 1n });
    service = new EntregaClienteService(repository as never, prisma as never, storage as never);
  });

  it('registrar grava o protocolo dentro da pasta raiz e persiste o mesmo caminho', async () => {
    await service.registrar({ remessa_id: 10, responsavel_recebimento: 'Ana' } as never, imagem);

    expect(storage.montarCaminho).toHaveBeenCalledWith('entregas/protocolos/uuid-fixo.png');
    expect(storage.put).toHaveBeenCalledWith(caminho, imagem.buffer);
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ imagemProtocolo: caminho }),
    );
  });

  it('atualizar grava o novo protocolo dentro da pasta raiz e persiste o mesmo caminho', async () => {
    await service.atualizar(1n, {} as never, imagem);

    expect(storage.put).toHaveBeenCalledWith(caminho, imagem.buffer);
    expect(repository.update).toHaveBeenCalledWith(1n, { imagemProtocolo: caminho });
  });

  it('sem imagem não toca no storage', async () => {
    await service.registrar({ remessa_id: 10, responsavel_recebimento: 'Ana' } as never);

    expect(storage.put).not.toHaveBeenCalled();
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ imagemProtocolo: undefined }),
    );
  });
});
