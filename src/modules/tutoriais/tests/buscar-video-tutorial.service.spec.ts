/**
 * IMPORTS
 */
import { HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';

// shared / exceptions (erro de regra de negócio)
import { BusinessException } from 'src/shared/exceptions/business.exception';

// shared / storage (arquivo e URL assinada)
import { StorageService } from 'src/shared/storage/storage.service';

// services do módulo
import { BuscarVideoTutorialService } from '../services/buscar-video-tutorial.service';

describe('BuscarVideoTutorialService', () => {
  let service: BuscarVideoTutorialService;
  const storage = { exists: jest.fn(), getSignedUrl: jest.fn() };
  const config = { getOrThrow: jest.fn() };
  const caminho = 'videos-tutorias/video-tutotial-pequeno.mp4';

  beforeEach(async () => {
    jest.clearAllMocks();
    config.getOrThrow.mockReturnValue(caminho);

    const moduleRef = await Test.createTestingModule({
      providers: [
        BuscarVideoTutorialService,
        { provide: StorageService, useValue: storage },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = moduleRef.get(BuscarVideoTutorialService);
  });

  it('retorna o nome do arquivo e a URL assinada do vídeo configurado', async () => {
    storage.exists.mockResolvedValue(true);
    storage.getSignedUrl.mockResolvedValue('https://storage.test/video-assinado');

    await expect(service.execute()).resolves.toEqual({
      nome: 'video-tutotial-pequeno.mp4',
      url: 'https://storage.test/video-assinado',
    });
    expect(config.getOrThrow).toHaveBeenCalledWith('tutoriais.caminhoVideo');
    expect(storage.exists).toHaveBeenCalledWith(caminho);
    expect(storage.getSignedUrl).toHaveBeenCalledWith(caminho);
  });

  it('lança 404 quando o vídeo não existe no storage', async () => {
    storage.exists.mockResolvedValue(false);

    const erro = await service.execute().catch((erroLancado: unknown) => erroLancado);

    expect(erro).toBeInstanceOf(BusinessException);
    expect((erro as BusinessException).getStatus()).toBe(HttpStatus.NOT_FOUND);
    expect((erro as BusinessException).message).toBe('Vídeo tutorial não encontrado.');
    expect(storage.getSignedUrl).not.toHaveBeenCalled();
  });

  it('propaga o erro quando o caminho do vídeo não está configurado', async () => {
    config.getOrThrow.mockImplementation(() => {
      throw new TypeError('Configuration key "tutoriais.caminhoVideo" does not exist');
    });

    await expect(service.execute()).rejects.toBeInstanceOf(TypeError);
    expect(storage.exists).not.toHaveBeenCalled();
  });
});
