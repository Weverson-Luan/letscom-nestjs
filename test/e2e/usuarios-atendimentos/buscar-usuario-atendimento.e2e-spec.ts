/**
 * IMPORTS
 */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';

// shared / prisma (conexão com o banco)
import { PrismaService } from 'src/shared/prisma/prisma.service';

// shared / auth (features e mensagens de permissão)
import { MENSAGEM_SEM_PERMISSAO } from 'src/shared/auth/features';

// helpers e2e (app, banco e autenticação)
import { criarAppE2e } from '../helpers/criar-app-e2e';
import { limparBanco } from '../helpers/limpar-banco';

// fixtures do módulo (rota, features e dados de teste)
import {
  autenticarAdmin,
  autenticarSemFeature,
  criarUsuarioAtendimento,
  criarUsuarioDono,
  ROTA_USUARIOS_ATENDIMENTOS as ROTA,
} from './usuarios-atendimentos.fixtures';

describe('GET /users-atendimentos/:id (e2e)', () => {
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

  it('responde 403 sem a feature acessar_admin', async () => {
    const { token } = await autenticarSemFeature(app);

    const resposta = await request(app.getHttpServer())
      .get(`${ROTA}/1`)
      .set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(403);
    expect(resposta.body.message).toBe(MENSAGEM_SEM_PERMISSAO);
  });

  it('detalha o usuário de atendimento com o usuário dono', async () => {
    const { token } = await autenticarAdmin(app);
    const dono = await criarUsuarioDono(app);
    const atendimento = await criarUsuarioAtendimento(prisma, dono.id, {
      nome: 'Atendente Buscado',
    });

    const resposta = await request(app.getHttpServer())
      .get(`${ROTA}/${atendimento.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(200);
    expect(resposta.body).toMatchObject({
      id: Number(atendimento.id),
      user_id: Number(dono.id),
      nome: 'Atendente Buscado',
      user: { id: Number(dono.id), nome: dono.nome, email: dono.email },
    });
    expect(resposta.body.user).not.toHaveProperty('senha');
  });

  it('responde 404 quando não existe', async () => {
    const { token } = await autenticarAdmin(app);

    const resposta = await request(app.getHttpServer())
      .get(`${ROTA}/999999`)
      .set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(404);
    expect(resposta.body.message).toBe('Atendimento não encontrado.');
  });
});
