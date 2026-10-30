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

// shared / utils (hash de senha)
import { HashService } from 'src/shared/utils/hash.service';

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

describe('PUT /usuarios-internos/:id (e2e)', () => {
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
    const resposta = await request(app.getHttpServer()).put(`${ROTA}/1`).send({});

    expect(resposta.status).toBe(401);
  });

  it('responde 403 para papel diferente de admin', async () => {
    const { token } = await autenticarPapelSemAcesso(app);

    const resposta = await request(app.getHttpServer())
      .put(`${ROTA}/1`)
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: 'Outro' });

    expect(resposta.status).toBe(403);
  });

  it('responde 403 sem a feature gerenciar_usuarios_internos', async () => {
    const { token } = await autenticarSemFeature(app);

    const resposta = await request(app.getHttpServer())
      .put(`${ROTA}/1`)
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: 'Outro' });

    expect(resposta.status).toBe(403);
    expect(resposta.body.message).toBe(MENSAGEM_SEM_PERMISSAO);
  });

  it('responde 400 com dados inválidos', async () => {
    const { token } = await autenticarAdmin(app);
    const consultor = await criarUsuarioComPapeis(app, [Role.CONSULTOR]);

    const resposta = await request(app.getHttpServer())
      .put(`${ROTA}/${consultor.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ tipo_pessoa: 'X', senha: '123' });

    expect(resposta.status).toBe(400);
    expect(resposta.body.errors).toEqual(
      expect.arrayContaining([
        'O tipo de pessoa deve ser F ou J.',
        'A senha deve ter pelo menos 6 caracteres.',
      ]),
    );
  });

  it('atualiza dados, senha e inativa sem alterar o e-mail', async () => {
    const { token } = await autenticarAdmin(app);
    const consultor = await criarUsuarioComPapeis(app, [Role.CONSULTOR]);

    const resposta = await request(app.getHttpServer())
      .put(`${ROTA}/${consultor.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        nome: 'Consultor Renomeado',
        telefone: '11911112222',
        senha: 'nova-senha',
        ativo: false,
      });

    expect(resposta.status).toBe(200);
    expect(resposta.body).toMatchObject({
      code: 200,
      status: 'success',
      message: 'Usuário interno atualizado com sucesso!',
      pagination: null,
      data: { nome: 'Consultor Renomeado', ativo: false, email: consultor.email },
    });
    expect(resposta.body.data).not.toHaveProperty('senha');

    const salvo = await prisma.user.findUniqueOrThrow({ where: { id: consultor.id } });
    expect(salvo).toMatchObject({
      nome: 'Consultor Renomeado',
      telefone: '11911112222',
      ativo: false,
      email: consultor.email,
    });
    await expect(app.get(HashService).check('nova-senha', salvo.senha)).resolves.toBe(true);
  });

  it('rejeita e-mail no body e mantém o e-mail salvo', async () => {
    const { token } = await autenticarAdmin(app);
    const consultor = await criarUsuarioComPapeis(app, [Role.CONSULTOR]);

    const resposta = await request(app.getHttpServer())
      .put(`${ROTA}/${consultor.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: 'Outro', email: 'novo@letscom.test' });

    expect(resposta.status).toBe(400);
    expect(resposta.body.errors).toContain('O e-mail não pode ser alterado.');
    const salvo = await prisma.user.findUniqueOrThrow({ where: { id: consultor.id } });
    expect(salvo.email).toBe(consultor.email);
    expect(salvo.nome).toBe(consultor.nome);
  });

  it('responde 409 com telefone de outro usuário', async () => {
    const { token } = await autenticarAdmin(app);
    const consultor = await criarUsuarioComPapeis(app, [Role.CONSULTOR]);
    const outro = await criarUsuarioComPapeis(app, [Role.RECEPCAO]);

    const resposta = await request(app.getHttpServer())
      .put(`${ROTA}/${consultor.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ telefone: outro.telefone });

    expect(resposta.status).toBe(409);
    expect(resposta.body.message).toBe('Já existe um usuário com este telefone.');
  });

  it('responde 404 ao editar cliente por esta rota', async () => {
    const { token } = await autenticarAdmin(app);
    const cliente = await criarUsuarioComPapeis(app, [Role.CLIENTE]);

    const resposta = await request(app.getHttpServer())
      .put(`${ROTA}/${cliente.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: 'Hack' });

    expect(resposta.status).toBe(404);
    const salvo = await prisma.user.findUniqueOrThrow({ where: { id: cliente.id } });
    expect(salvo.nome).toBe(cliente.nome);
  });
});
