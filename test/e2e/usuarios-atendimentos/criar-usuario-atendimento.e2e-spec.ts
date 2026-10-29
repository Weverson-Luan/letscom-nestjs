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
  criarUsuarioDono,
  ROTA_USUARIOS_ATENDIMENTOS as ROTA,
} from './usuarios-atendimentos.fixtures';

describe('POST /users-atendimentos (e2e)', () => {
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

  function montarPayload(usuarioId: bigint, sobrescrever: Record<string, unknown> = {}) {
    return {
      user_id: Number(usuarioId),
      email: 'novo.atendimento@empresa.test',
      telefone: '11988887777',
      ...sobrescrever,
    };
  }

  it('responde 401 sem token', async () => {
    const resposta = await request(app.getHttpServer()).post(ROTA).send({});

    expect(resposta.status).toBe(401);
  });

  it('responde 403 sem a feature acessar_admin', async () => {
    const { token } = await autenticarSemFeature(app);

    const resposta = await request(app.getHttpServer())
      .post(ROTA)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(resposta.status).toBe(403);
    expect(resposta.body.message).toBe(MENSAGEM_SEM_PERMISSAO);
  });

  it('responde 400 com DTO inválido', async () => {
    const { token } = await autenticarAdmin(app);

    const resposta = await request(app.getHttpServer())
      .post(ROTA)
      .set('Authorization', `Bearer ${token}`)
      .send({ user_id: 1, email: 'nao-e-email' });

    expect(resposta.status).toBe(400);
  });

  it('cria o usuário de atendimento e converte ativo "false" em false', async () => {
    const { token } = await autenticarAdmin(app);
    const dono = await criarUsuarioDono(app);

    const resposta = await request(app.getHttpServer())
      .post(ROTA)
      .set('Authorization', `Bearer ${token}`)
      .send(montarPayload(dono.id, { nome: 'Novo Atendente', ativo: 'false' }));

    expect(resposta.status).toBe(201);
    expect(resposta.body).toMatchObject({
      user_id: Number(dono.id),
      nome: 'Novo Atendente',
      email: 'novo.atendimento@empresa.test',
      ativo: false,
      user: { id: Number(dono.id), nome: dono.nome, email: dono.email },
    });
    expect(resposta.body.user).not.toHaveProperty('senha');
    const persistido = await prisma.userAtendimento.findUniqueOrThrow({
      where: { email: 'novo.atendimento@empresa.test' },
    });
    expect(persistido).toMatchObject({ userId: dono.id, ativo: false, documento: null });
  });

  it('responde 404 quando o usuário dono foi excluído', async () => {
    const { token } = await autenticarAdmin(app);
    const dono = await criarUsuarioDono(app);
    await prisma.user.update({ where: { id: dono.id }, data: { deletedAt: new Date() } });

    const resposta = await request(app.getHttpServer())
      .post(ROTA)
      .set('Authorization', `Bearer ${token}`)
      .send(montarPayload(dono.id));

    expect(resposta.status).toBe(404);
    expect(resposta.body.message).toBe('Usuário não encontrado.');
    await expect(prisma.userAtendimento.count()).resolves.toBe(0);
  });
});
