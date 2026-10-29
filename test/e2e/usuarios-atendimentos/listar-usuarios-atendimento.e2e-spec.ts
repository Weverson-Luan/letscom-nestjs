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

describe('GET /users-atendimentos (e2e)', () => {
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
    const resposta = await request(app.getHttpServer()).get(ROTA);

    expect(resposta.status).toBe(401);
  });

  it('responde 403 sem a feature acessar_admin', async () => {
    const { token } = await autenticarSemFeature(app);

    const resposta = await request(app.getHttpServer())
      .get(ROTA)
      .set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(403);
    expect(resposta.body.message).toBe(MENSAGEM_SEM_PERMISSAO);
  });

  it('lista os usuários de atendimento por id com o usuário dono', async () => {
    const { token } = await autenticarAdmin(app);
    const dono = await criarUsuarioDono(app);
    const primeiro = await criarUsuarioAtendimento(prisma, dono.id);
    const segundo = await criarUsuarioAtendimento(prisma, dono.id);

    const resposta = await request(app.getHttpServer())
      .get(ROTA)
      .set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(200);
    expect(resposta.body.map((atendimento: { id: number }) => atendimento.id)).toEqual([
      Number(primeiro.id),
      Number(segundo.id),
    ]);
    expect(resposta.body[0]).toMatchObject({
      id: Number(primeiro.id),
      user_id: Number(dono.id),
      email: primeiro.email,
      telefone: primeiro.telefone,
      ativo: true,
      user: { id: Number(dono.id), nome: dono.nome, email: dono.email },
    });
    expect(resposta.body[0].user).not.toHaveProperty('senha');
  });
});
