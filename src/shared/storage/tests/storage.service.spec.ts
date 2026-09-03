jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import { join } from 'path';
import { StorageService } from '../storage.service';

const mockedGetSignedUrl = getSignedUrl as jest.MockedFunction<typeof getSignedUrl>;

describe('StorageService', () => {
  const localRoot = join(process.cwd(), 'storage', 'app');
  const testPath = 'remessas/teste/foto.jpg';

  const createLocalService = () => {
    const config = {
      get: jest.fn((key: string) => {
        if (key === 'storage.disk') return 'local';
        if (key === 'app.url') return 'http://localhost:3000';
        return undefined;
      }),
    };
    const service = new StorageService(config as unknown as ConfigService);
    service.onModuleInit();
    return service;
  };

  afterEach(async () => {
    await fs.rm(join(localRoot, 'remessas'), { recursive: true, force: true });
  });

  it('usa disco local por padrão', () => {
    const service = createLocalService();
    expect(service.usesR2()).toBe(false);
  });

  it('faz upload e download no disco local', async () => {
    const service = createLocalService();
    const content = Buffer.from('foto-cracha');

    await service.put(testPath, content);

    const downloaded = await service.download(testPath);
    expect(downloaded?.toString()).toBe('foto-cracha');
    expect(await service.exists(testPath)).toBe(true);
  });

  it('retorna URL local assinada no disco local', async () => {
    const service = createLocalService();

    const url = await service.getSignedUrl(testPath);

    expect(url).toBe('http://localhost:3000/storage/remessas/teste/foto.jpg');
  });

  it('remove arquivo do disco local', async () => {
    const service = createLocalService();
    await service.put(testPath, 'conteudo');

    await service.delete(testPath);

    expect(await service.exists(testPath)).toBe(false);
  });

  it('gera URL assinada no R2', async () => {
    mockedGetSignedUrl.mockResolvedValue('https://signed.example/foto.jpg');
    const config = {
      get: jest.fn((key: string) => {
        if (key === 'storage.disk') return 'r2';
        if (key === 'storage.signedUrlExpiration') return 900;
        if (key === 'storage.r2') {
          return {
            bucket: 'letscom-bucket',
            endpoint: 'https://example.r2.cloudflarestorage.com',
            accessKeyId: 'key',
            secretAccessKey: 'secret',
          };
        }
        return undefined;
      }),
    };
    const service = new StorageService(config as unknown as ConfigService);
    service.onModuleInit();

    await expect(service.getSignedUrl(testPath)).resolves.toBe(
      'https://signed.example/foto.jpg',
    );
    expect(mockedGetSignedUrl).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      { expiresIn: 900 },
    );
  });
});
