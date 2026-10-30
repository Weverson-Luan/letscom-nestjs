/**
 * IMPORTS
 */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';

// shared / prisma (conexão com o banco)
import { PrismaService } from 'src/shared/prisma/prisma.service';

// shared / auth (features e mensagens de permissão)
import { MENSAGEM_SEM_PERMISSAO } from 'src/shared/auth/features';

// shared / roles
import { Role } from 'src/shared/constants/roles';

// helpers e2e (app, banco e autenticação)
import { criarAppE2e } from '../helpers/criar-app-e2e';
import { limparBanco } from '../helpers/limpar-banco';

// fixtures do módulo (rota, autenticação e dados de teste)
import {
  autenticarAdmin,
  autenticarPapelSemAcesso,
  autenticarSemFeature,
  criarUsuarioComPapeis,
  ROTA_USUARIOS_INTERNOS as ROTA,
} from './usuarios-internos.fixtures';

describe('GET /usuarios-internos/:id (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await criarAppE2e();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await limparBanco(prisma);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('responde 401 sem token', async () => {
    const resposta = await request(app.getHttpServer()).get(`${ROTA}/1`);

    expect(resposta.status).toBe(401);
  });

  it('responde 403 para papel diferente de admin', async () => {
    const { token } = await autenticarPapelSemAcesso(app);

    const resposta = await request(app.getHttpServer())
      .get(`${ROTA}/1`)
      .set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(403);
  });

  it('responde 403 sem a feature gerenciar_usuarios_internos', async () => {
    const { token } = await autenticarSemFeature(app);

    const resposta = await request(app.getHttpServer())
      .get(`${ROTA}/1`)
      .set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(403);
    expect(resposta.body.message).toBe(MENSAGEM_SEM_PERMISSAO);
  });

  it('responde 400 para id não numérico', async () => {
    const { token } = await autenticarAdmin(app);

    const resposta = await request(app.getHttpServer())
      .get(`${ROTA}/abc`)
      .set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(400);
  });

  it('detalha o usuário interno sem expor a senha', async () => {
    const { token } = await autenticarAdmin(app);
    const consultor = await criarUsuarioComPapeis(app, [Role.CONSULTOR]);

    const resposta = await request(app.getHttpServer())
      .get(`${ROTA}/${consultor.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(200);
    expect(resposta.body).toMatchObject({
      code: 200,
      status: 'success',
      message: 'Usuário interno carregado com sucesso!',
      pagination: null,
      data: { id: Number(consultor.id), email: consultor.email, papel: Role.CONSULTOR },
    });
    expect(resposta.body.data).not.toHaveProperty('senha');
  });

  it('responde 404 para cliente', async () => {
    const { token } = await autenticarAdmin(app);
    const cliente = await criarUsuarioComPapeis(app, [Role.CLIENTE]);

    const resposta = await request(app.getHttpServer())
      .get(`${ROTA}/${cliente.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(404);
    expect(resposta.body.message).toBe('Usuário interno não encontrado.');
  });
});
