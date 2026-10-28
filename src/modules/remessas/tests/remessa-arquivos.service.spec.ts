import { RemessaService } from '../services/remessa.service';

jest.mock('uuid', () => ({ v4: () => 'uuid-fixo' }));

/**
 * Cobre a gravação dos arquivos da solicitação de remessa (planilha e fotos)
 * dentro da pasta raiz do storage. Os passos são privados no service legado,
 * por isso são chamados diretamente.
 */
describe('RemessaService — arquivos da solicitação na pasta raiz do storage', () => {
  const tx = {
    remessaPlanilha: { create: jest.fn() },
    remessaFoto: { create: jest.fn() },
  };
  const storage = {
    put: jest.fn(),
    montarCaminho: jest.fn((relativo: string) => `homologacao/${relativo}`),
  };
  const image = { toJpeg: jest.fn() };
  const zip = { extract: jest.fn() };
  let service: RemessaService;
  type PassosPrivados = {
    persistirPlanilha: (...args: unknown[]) => Promise<void>;
    persistirFotos: (...args: unknown[]) => Promise<void>;
  };
  const passos = () => service as unknown as PassosPrivados;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RemessaService(
      {} as never,
      {} as never,
      storage as never,
      image as never,
      {} as never,
      zip as never,
      { get: jest.fn() } as never,
      {} as never,
    );
  });

  it('grava a planilha dentro da pasta raiz e persiste o mesmo caminho', async () => {
    const storedFiles: string[] = [];
    const arquivo = { buffer: Buffer.from('csv'), originalname: 'dados.CSV' };

    await passos().persistirPlanilha(tx, 10n, arquivo, 5n, storedFiles);

    const caminho = 'homologacao/remessas/10/planilhas/uuid-fixo.csv';
    expect(storage.put).toHaveBeenCalledWith(caminho, arquivo.buffer);
    expect(storedFiles).toEqual([caminho]);
    expect(tx.remessaPlanilha.create).toHaveBeenCalledWith({
      data: { remessaId: 10n, clienteId: 5n, filePath: caminho, tipo: 'csv' },
    });
  });

  it('grava as fotos dentro da pasta raiz e persiste o mesmo caminho', async () => {
    const storedFiles: string[] = [];
    const jpeg = Buffer.from('jpeg');
    zip.extract.mockResolvedValue([{ name: '123.png', buffer: Buffer.from('png') }]);
    image.toJpeg.mockResolvedValue(jpeg);

    await passos().persistirFotos(
      tx,
      10n,
      { buffer: Buffer.from('zip'), originalname: 'fotos.zip' },
      { '123': { matricula: '123', nome: 'Ana' } },
      5n,
      storedFiles,
    );

    const caminho = 'homologacao/remessas/10/fotos/123.jpg';
    expect(storage.put).toHaveBeenCalledWith(caminho, jpeg);
    expect(storedFiles).toEqual([caminho]);
    expect(tx.remessaFoto.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        remessaId: 10n,
        clienteId: 5n,
        filePath: caminho,
        matricula: '123',
      }),
    });
  });
});
