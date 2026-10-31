/**
 * IMPORTS
 */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';

// shared / prisma (conexão com o banco)
import { PrismaService } from 'src/shared/prisma/prisma.service';

// shared / storage (substituído pelo storage falso)
import { StorageService } from 'src/shared/storage/storage.service';

// helpers e2e (app, banco)
import { criarAppE2e } from '../helpers/criar-app-e2e';
import { limparBanco } from '../helpers/limpar-banco';

// fixtures do módulo (rota, storage falso e autenticação)
import {
  autenticarCliente,
  autenticarSemPapel,
  criarStorageFalso,
  ROTA_VIDEOS_TUTORIAIS as ROTA,
} from './tutoriais.fixtures';

describe('GET /videos-tutorias (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const storage = criarStorageFalso();

  beforeAll(async () => {
    app = await criarAppE2e((builder) =>
      builder.overrideProvider(StorageService).useValue(storage),
    );
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await limparBanco(prisma);
    storage.exists.mockClear().mockResolvedValue(true);
    storage.getSignedUrl.mockClear();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('responde 401 sem token', async () => {
    const resposta = await request(app.getHttpServer()).get(ROTA);

    expect(resposta.status).toBe(401);
  });

  it('responde 403 para usuário sem papel', async () => {
    const { token } = await autenticarSemPapel(app);

    const resposta = await request(app.getHttpServer())
      .get(ROTA)
      .set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(403);
  });

  it('responde 404 quando o vídeo não existe no storage', async () => {
    const { token } = await autenticarCliente(app);
    storage.exists.mockResolvedValue(false);

    const resposta = await request(app.getHttpServer())
      .get(ROTA)
      .set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(404);
    expect(resposta.body).toMatchObject({
      status: 'error',
      message: 'Vídeo tutorial não encontrado.',
    });
    expect(storage.getSignedUrl).not.toHaveBeenCalled();
  });

  it('responde 200 com o nome e a URL assinada do vídeo', async () => {
    const { token } = await autenticarCliente(app);

    const resposta = await request(app.getHttpServer())
      .get(ROTA)
      .set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual({
      code: 200,
      status: 'success',
      message: 'URL do vídeo tutorial gerada com sucesso.',
      data: {
        nome: 'video-tutotial-pequeno.mp4',
        url: 'https://storage.e2e.test/video-assinado',
      },
      pagination: null,
    });
    expect(storage.exists).toHaveBeenCalledWith('videos-tutorias/video-tutotial-pequeno.mp4');
    expect(storage.getSignedUrl).toHaveBeenCalledWith('videos-tutorias/video-tutotial-pequeno.mp4');
  });
});
