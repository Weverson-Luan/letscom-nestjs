/**
 * IMPORTS
 */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';

// shared / prisma (conexão com o banco)
import { PrismaService } from 'src/shared/prisma/prisma.service';

// shared / auth (features e mensagens de permissão)
import { Feature, MENSAGEM_SEM_PERMISSAO } from 'src/shared/auth/features';

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
  ROTA_USUARIOS_CLIENTE as ROTA,
} from './usuarios-cliente.fixtures';

describe('PUT /usuarios-cliente/:id (e2e)', () => {
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
    const resposta = await request(app.getHttpServer()).put(`${ROTA}/1`).send({ nome: 'X' });

    expect(resposta.status).toBe(401);
  });

  it('responde 403 para papel sem acesso', async () => {
    const { token } = await autenticarPapelSemAcesso(app);

    const resposta = await request(app.getHttpServer())
      .put(`${ROTA}/1`)
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: 'X' });

    expect(resposta.status).toBe(403);
  });

  it('responde 403 sem a feature liberada', async () => {
    const { token } = await criarUsuarioAutenticado(app, Role.ADMIN);

    const resposta = await request(app.getHttpServer())
      .put(`${ROTA}/1`)
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: 'X' });

    expect(resposta.status).toBe(403);
    expect(resposta.body.message).toBe(MENSAGEM_SEM_PERMISSAO);
  });

  it('responde 400 com DTO inválido', async () => {
    const { token } = await autenticarAdmin(app);

    const resposta = await request(app.getHttpServer())
      .put(`${ROTA}/1`)
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'nao-e-email' });

    expect(resposta.status).toBe(400);
  });

  it('atualiza nome e ativo com as duas features liberadas', async () => {
    const { token } = await autenticarAdmin(app);
    const cliente = await criarCliente(app);
    const subordinado = await criarSubordinado(prisma, cliente.id);

    const resposta = await request(app.getHttpServer())
      .put(`${ROTA}/${subordinado.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: 'Nome Atualizado', ativo: false });

    expect(resposta.status).toBe(200);
    expect(resposta.body.message).toBe('Usuário do cliente atualizado com sucesso!');
    expect(resposta.body.data).toMatchObject({
      id: Number(subordinado.id),
      nome: 'Nome Atualizado',
      ativo: false,
    });
    const persistido = await prisma.userCliente.findUniqueOrThrow({
      where: { id: subordinado.id },
    });
    expect(persistido).toMatchObject({ nome: 'Nome Atualizado', ativo: false });
  });

  it('responde 403 ao alterar ativo sem inativar_usuario_cliente', async () => {
    const { token } = await autenticarAdmin(app, [Feature.EDITAR_USUARIOS_CLIENTE]);
    const cliente = await criarCliente(app);
    const subordinado = await criarSubordinado(prisma, cliente.id);

    const somenteNome = await request(app.getHttpServer())
      .put(`${ROTA}/${subordinado.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: 'Pode' });
    const comAtivo = await request(app.getHttpServer())
      .put(`${ROTA}/${subordinado.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ ativo: false });

    expect(somenteNome.status).toBe(200);
    expect(comAtivo.status).toBe(403);
    expect(comAtivo.body.message).toBe(MENSAGEM_SEM_PERMISSAO);
    const persistido = await prisma.userCliente.findUniqueOrThrow({
      where: { id: subordinado.id },
    });
    expect(persistido.ativo).toBe(true);
  });

  it('responde 404 quando o subordinado não existe', async () => {
    const { token } = await autenticarAdmin(app);

    const resposta = await request(app.getHttpServer())
      .put(`${ROTA}/999999`)
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: 'X' });

    expect(resposta.status).toBe(404);
    expect(resposta.body.message).toBe('Usuário não encontrado.');
  });
});
