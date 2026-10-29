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
import { criarUsuarioAutenticado } from '../helpers/criar-usuario-autenticado';
import { limparBanco } from '../helpers/limpar-banco';

// fixtures do módulo (rota, features e dados de teste)
import {
  autenticarAdmin,
  autenticarPapelSemAcesso,
  criarCliente,
  criarSubordinado,
  ROTA_USUARIOS_CLIENTE,
} from './usuarios-cliente.fixtures';

const ROTA = `${ROTA_USUARIOS_CLIENTE}/cliente`;

describe('GET /usuarios-cliente/cliente/:id (e2e)', () => {
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

  it('responde 403 para papel sem acesso', async () => {
    const { token } = await autenticarPapelSemAcesso(app);

    const resposta = await request(app.getHttpServer())
      .get(`${ROTA}/1`)
      .set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(403);
  });

  it('responde 403 sem a feature liberada', async () => {
    const { token } = await criarUsuarioAutenticado(app, Role.ADMIN);

    const resposta = await request(app.getHttpServer())
      .get(`${ROTA}/1`)
      .set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(403);
    expect(resposta.body.message).toBe(MENSAGEM_SEM_PERMISSAO);
  });

  it('responde 400 com order inválido', async () => {
    const { token } = await autenticarAdmin(app);

    const resposta = await request(app.getHttpServer())
      .get(`${ROTA}/1?order=invalido`)
      .set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(400);
  });

  it('pagina e ordena só os subordinados do cliente', async () => {
    const { token } = await autenticarAdmin(app);
    const cliente = await criarCliente(app);
    const outroCliente = await criarCliente(app);
    await criarSubordinado(prisma, cliente.id, { nome: 'Ana' });
    await criarSubordinado(prisma, cliente.id, { nome: 'Bruno' });
    await criarSubordinado(prisma, cliente.id, { nome: 'Carla' });
    await criarSubordinado(prisma, outroCliente.id, { nome: 'Daniel' });

    const resposta = await request(app.getHttpServer())
      .get(`${ROTA}/${cliente.id}?page=2&per_page=2&sort_by=nome&order=asc`)
      .set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(200);
    expect(resposta.body.data.map((usuario: { nome: string }) => usuario.nome)).toEqual(['Carla']);
    expect(resposta.body.pagination).toEqual(
      expect.objectContaining({ total: 3, current_page: 2, last_page: 2 }),
    );
  });

  it('busca por nome sem trazer subordinados de outro cliente', async () => {
    const { token } = await autenticarAdmin(app);
    const cliente = await criarCliente(app);
    const outroCliente = await criarCliente(app);
    await criarSubordinado(prisma, cliente.id, { nome: 'Ana' });
    await criarSubordinado(prisma, cliente.id, { nome: 'Bruno' });
    await criarSubordinado(prisma, outroCliente.id, { nome: 'Ana de Outro Cliente' });

    const resposta = await request(app.getHttpServer())
      .get(`${ROTA}/${cliente.id}?search=Ana`)
      .set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(200);
    expect(resposta.body.data.map((usuario: { nome: string }) => usuario.nome)).toEqual(['Ana']);
  });
});
