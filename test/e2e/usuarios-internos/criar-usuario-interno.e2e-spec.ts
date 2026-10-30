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
import { buscarOuCriarPapel } from '../helpers/criar-usuario-autenticado';
import { limparBanco } from '../helpers/limpar-banco';

// fixtures do módulo (rota, autenticação e dados de teste)
import {
  autenticarAdmin,
  autenticarPapelSemAcesso,
  autenticarSemFeature,
  criarUsuarioComPapeis,
  ROTA_USUARIOS_INTERNOS as ROTA,
} from './usuarios-internos.fixtures';

describe('POST /usuarios-internos (e2e)', () => {
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

  function montarPayload(sobrescrever: Record<string, unknown> = {}) {
    return {
      nome: 'Maria Produção',
      email: 'maria.producao@letscom.test',
      senha: 'senha123',
      telefone: '11955554444',
      tipo_pessoa: 'F',
      papel: Role.PRODUCAO,
      ...sobrescrever,
    };
  }

  it('responde 401 sem token', async () => {
    const resposta = await request(app.getHttpServer()).post(ROTA).send({});

    expect(resposta.status).toBe(401);
  });

  it('responde 403 para papel diferente de admin', async () => {
    const { token } = await autenticarPapelSemAcesso(app);

    const resposta = await request(app.getHttpServer())
      .post(ROTA)
      .set('Authorization', `Bearer ${token}`)
      .send(montarPayload());

    expect(resposta.status).toBe(403);
  });

  it('responde 403 sem a feature gerenciar_usuarios_internos', async () => {
    const { token } = await autenticarSemFeature(app);

    const resposta = await request(app.getHttpServer())
      .post(ROTA)
      .set('Authorization', `Bearer ${token}`)
      .send(montarPayload());

    expect(resposta.status).toBe(403);
    expect(resposta.body.message).toBe(MENSAGEM_SEM_PERMISSAO);
  });

  it('responde 400 com papel inválido', async () => {
    const { token } = await autenticarAdmin(app);

    const resposta = await request(app.getHttpServer())
      .post(ROTA)
      .set('Authorization', `Bearer ${token}`)
      .send(montarPayload({ papel: Role.ADMIN }));

    expect(resposta.status).toBe(400);
    await expect(
      prisma.user.count({ where: { email: 'maria.producao@letscom.test' } }),
    ).resolves.toBe(0);
  });

  it('cria o usuário com senha em hash e papel vinculado', async () => {
    const { token } = await autenticarAdmin(app);
    await buscarOuCriarPapel(prisma, Role.PRODUCAO);

    const resposta = await request(app.getHttpServer())
      .post(ROTA)
      .set('Authorization', `Bearer ${token}`)
      .send(montarPayload());

    expect(resposta.status).toBe(201);
    expect(resposta.body).toMatchObject({
      code: 201,
      status: 'success',
      message: 'Usuário interno criado com sucesso!',
      pagination: null,
      data: {
        nome: 'Maria Produção',
        email: 'maria.producao@letscom.test',
        papel: Role.PRODUCAO,
        ativo: true,
      },
    });
    expect(resposta.body.data).not.toHaveProperty('senha');

    const salvo = await prisma.user.findUniqueOrThrow({
      where: { email: 'maria.producao@letscom.test' },
    });
    expect(salvo.senha).not.toBe('senha123');
    await expect(app.get(HashService).check('senha123', salvo.senha)).resolves.toBe(true);
    const papeis = await prisma.$queryRaw<{ nome: string }[]>`
      SELECT r.nome FROM roles r INNER JOIN role_user ru ON ru.role_id = r.id
      WHERE ru.user_id = ${salvo.id} AND ru.ativo = 1
    `;
    expect(papeis.map((papel) => papel.nome)).toEqual([Role.PRODUCAO]);
  });

  it('responde 409 com e-mail já cadastrado', async () => {
    const { token } = await autenticarAdmin(app);
    await buscarOuCriarPapel(prisma, Role.PRODUCAO);
    const existente = await criarUsuarioComPapeis(app, [Role.CONSULTOR]);

    const resposta = await request(app.getHttpServer())
      .post(ROTA)
      .set('Authorization', `Bearer ${token}`)
      .send(montarPayload({ email: existente.email }));

    expect(resposta.status).toBe(409);
    expect(resposta.body.message).toBe('Já existe um usuário com este e-mail.');
  });
});
