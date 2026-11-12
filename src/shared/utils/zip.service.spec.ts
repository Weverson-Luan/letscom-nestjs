/**
 * IMPORTS
 */
import * as unzipper from 'unzipper';

// shared / upload (limites de upload e ZIP)
import {
  QUANTIDADE_MAXIMA_ENTRADAS_ZIP,
  TAMANHO_MAXIMO_ZIP_DESCOMPACTADO_BYTES,
} from '../upload/limites-upload';

// shared / utils (serviço testado)
import { ZipService } from './zip.service';

jest.mock('unzipper', () => ({ Open: { buffer: jest.fn() } }));

const abrirZipMock = unzipper.Open.buffer as jest.Mock;

function arquivoZip(path: string, tamanho = 10) {
  return {
    type: 'File',
    path,
    uncompressedSize: tamanho,
    buffer: jest.fn().mockResolvedValue(Buffer.alloc(tamanho)),
  };
}

describe('ZipService', () => {
  const servico = new ZipService();

  beforeEach(() => jest.clearAllMocks());

  it('extrai os arquivos ignorando diretórios, ocultos e __MACOSX', async () => {
    abrirZipMock.mockResolvedValue({
      files: [
        arquivoZip('fotos/a.jpg'),
        arquivoZip('.DS_Store'),
        arquivoZip('__MACOSX/b.jpg'),
        { type: 'Directory', path: 'fotos/', uncompressedSize: 0 },
      ],
    });

    const entradas = await servico.extract(Buffer.alloc(1));

    expect(entradas.map((entrada) => entrada.name)).toEqual(['a.jpg']);
  });

  it('recusa ZIP com tamanho descompactado acima do limite sem ler os arquivos', async () => {
    const grande = arquivoZip('a.jpg', TAMANHO_MAXIMO_ZIP_DESCOMPACTADO_BYTES + 1);
    abrirZipMock.mockResolvedValue({ files: [grande] });

    await expect(servico.extract(Buffer.alloc(1))).rejects.toMatchObject({ status: 413 });
    expect(grande.buffer).not.toHaveBeenCalled();
  });

  it('recusa ZIP com entradas demais', async () => {
    const files = Array.from({ length: QUANTIDADE_MAXIMA_ENTRADAS_ZIP + 1 }, (_, i) =>
      arquivoZip(`${i}.jpg`, 1),
    );
    abrirZipMock.mockResolvedValue({ files });

    await expect(servico.extract(Buffer.alloc(1))).rejects.toMatchObject({ status: 413 });
  });
});
