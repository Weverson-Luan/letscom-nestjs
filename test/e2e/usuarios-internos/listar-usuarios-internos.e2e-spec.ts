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

describe('GET /usuarios-internos (e2e)', () => {
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

  it('responde 403 para papel diferente de admin', async () => {
    const { token } = await autenticarPapelSemAcesso(app);

    const resposta = await request(app.getHttpServer())
      .get(ROTA)
      .set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(403);
  });

  it('responde 403 sem a feature gerenciar_usuarios_internos', async () => {
    const { token } = await autenticarSemFeature(app);

    const resposta = await request(app.getHttpServer())
      .get(ROTA)
      .set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(403);
    expect(resposta.body.message).toBe(MENSAGEM_SEM_PERMISSAO);
  });

  it('responde 400 para papel fora da lista', async () => {
    const { token } = await autenticarAdmin(app);

    const resposta = await request(app.getHttpServer())
      .get(ROTA)
      .query({ papel: Role.ADMIN })
      .set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(400);
  });

  it('lista só consultor, produção e recepção sem outros papéis', async () => {
    const { token } = await autenticarAdmin(app);
    const consultor = await criarUsuarioComPapeis(app, [Role.CONSULTOR]);
    const producao = await criarUsuarioComPapeis(app, [Role.PRODUCAO]);
    const recepcao = await criarUsuarioComPapeis(app, [Role.RECEPCAO]);
    await criarUsuarioComPapeis(app, [Role.CLIENTE]);
    await criarUsuarioComPapeis(app, [Role.EXPEDICAO]);
    await criarUsuarioComPapeis(app, [Role.CONSULTOR, Role.ADMIN]);

    const resposta = await request(app.getHttpServer())
      .get(ROTA)
      .set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(200);
    expect(resposta.body).toMatchObject({
      code: 200,
      status: 'success',
      message: 'Usuários internos carregados com sucesso!',
      pagination: { current_page: 1, last_page: 1, per_page: 10, total: 3 },
    });
    const papelPorId = Object.fromEntries(
      resposta.body.data.map((usuario: { id: number; papel: string }) => [
        usuario.id,
        usuario.papel,
      ]),
    );
    expect(papelPorId).toEqual({
      [Number(consultor.id)]: Role.CONSULTOR,
      [Number(producao.id)]: Role.PRODUCAO,
      [Number(recepcao.id)]: Role.RECEPCAO,
    });
    expect(resposta.body.data[0]).not.toHaveProperty('senha');
  });

  it('filtra por papel e por busca', async () => {
    const { token } = await autenticarAdmin(app);
    const recepcao = await criarUsuarioComPapeis(app, [Role.RECEPCAO]);
    await criarUsuarioComPapeis(app, [Role.CONSULTOR]);

    const porPapel = await request(app.getHttpServer())
      .get(ROTA)
      .query({ papel: Role.RECEPCAO })
      .set('Authorization', `Bearer ${token}`);
    const porBusca = await request(app.getHttpServer())
      .get(ROTA)
      .query({ search: recepcao.email })
      .set('Authorization', `Bearer ${token}`);

    const extrairIds = (corpo: { data: { id: number }[] }) =>
      corpo.data.map((usuario) => usuario.id);
    expect(extrairIds(porPapel.body)).toEqual([Number(recepcao.id)]);
    expect(extrairIds(porBusca.body)).toEqual([Number(recepcao.id)]);
  });
});
