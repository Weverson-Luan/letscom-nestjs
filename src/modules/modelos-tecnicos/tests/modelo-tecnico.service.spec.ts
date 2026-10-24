import { ModeloTecnicoService } from '../services/modelo-tecnico.service';

jest.mock('crypto', () => ({ ...jest.requireActual('crypto'), randomUUID: () => 'uuid-fixo' }));

describe('ModeloTecnicoService — fotos na pasta raiz do storage', () => {
  const repository = { create: jest.fn() };
  const storage = {
    put: jest.fn(),
    delete: jest.fn(),
    montarCaminho: jest.fn((relativo: string) => `homologacao/${relativo}`),
  };
  let service: ModeloTecnicoService;

  const dto = {
    cliente_id: 1,
    produto_id: 2,
    tecnologia_id: 3,
    nome_modelo: 'Crachá',
    campo_chave: 'matricula',
    posicionamento: 'v',
  };
  const foto = (originalname: string) => ({
    buffer: Buffer.from(originalname),
    originalname,
    mimetype: 'image/png',
  });

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ModeloTecnicoService(
      repository as never,
      {} as never,
      storage as never,
      {} as never,
    );
    jest.spyOn(service as never, 'validarFks').mockResolvedValue(undefined as never);
    repository.create.mockResolvedValue({ id: 1n });
  });

  it('grava frente e verso dentro da pasta raiz e persiste os mesmos caminhos', async () => {
    const frente = foto('frente.png');
    const verso = foto('verso.png');

    await service.criar(dto as never, frente, verso);

    expect(storage.put).toHaveBeenCalledWith(
      'homologacao/modelos/frente/uuid-fixo.png',
      frente.buffer,
    );
    expect(storage.put).toHaveBeenCalledWith(
      'homologacao/modelos/verso/uuid-fixo.png',
      verso.buffer,
    );
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        fotoFrentePath: 'homologacao/modelos/frente/uuid-fixo.png',
        fotoVersoPath: 'homologacao/modelos/verso/uuid-fixo.png',
      }),
    );
  });
});
