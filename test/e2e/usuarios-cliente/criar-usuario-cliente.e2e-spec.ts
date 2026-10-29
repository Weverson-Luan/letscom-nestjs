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
import { buscarOuCriarPapel, criarUsuarioAutenticado } from '../helpers/criar-usuario-autenticado';

// fixtures do módulo (rota, features e dados de teste)
import {
  autenticarAdmin,
  autenticarPapelSemAcesso,
  criarCliente,
  criarSubordinado,
  ROTA_USUARIOS_CLIENTE as ROTA,
} from './usuarios-cliente.fixtures';

describe('POST /usuarios-cliente (e2e)', () => {
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

  function montarPayload(clienteId: bigint, sobrescrever: Record<string, unknown> = {}) {
    return {
      cliente_id: Number(clienteId),
      email: 'novo.sub@empresa.test',
      senha: 'senha123',
      ...sobrescrever,
    };
  }

  it('responde 401 sem token', async () => {
    const resposta = await request(app.getHttpServer()).post(ROTA).send({});

    expect(resposta.status).toBe(401);
  });

  it('responde 403 para papel sem acesso', async () => {
    const { token } = await autenticarPapelSemAcesso(app);

    const resposta = await request(app.getHttpServer())
      .post(ROTA)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(resposta.status).toBe(403);
  });

  it('responde 403 sem a feature liberada', async () => {
    const { token } = await criarUsuarioAutenticado(app, Role.ADMIN);

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
      .send({ cliente_id: 1, email: 'nao-e-email', senha: '123' });

    expect(resposta.status).toBe(400);
  });

  it('cria o subordinado com senha em hash, ativo "0" como false e papel subordinado', async () => {
    const { token } = await autenticarAdmin(app);
    const cliente = await criarCliente(app);
    const papelSubordinado = await buscarOuCriarPapel(prisma, Role.SUBORDINADO);

    const resposta = await request(app.getHttpServer())
      .post(ROTA)
      .set('Authorization', `Bearer ${token}`)
      .send(montarPayload(cliente.id, { nome: 'Novo Sub', ativo: '0' }));

    expect(resposta.status).toBe(201);
    expect(resposta.body.message).toBe('Usuário do cliente criado com sucesso!');
    expect(resposta.body.data).toMatchObject({
      cliente_id: Number(cliente.id),
      email: 'novo.sub@empresa.test',
      nome: 'Novo Sub',
      ativo: false,
    });

    const persistido = await prisma.userCliente.findUniqueOrThrow({
      where: { email: 'novo.sub@empresa.test' },
    });
    await expect(app.get(HashService).check('senha123', persistido.senha)).resolves.toBe(true);
    const papeis = await prisma.$queryRaw<Array<{ role_id: bigint }>>`
      SELECT role_id FROM role_user WHERE client_sub_id = ${persistido.id}
    `;
    expect(papeis.map((papel) => papel.role_id)).toEqual([papelSubordinado.id]);
  });

  it('responde 422 para e-mail já cadastrado', async () => {
    const { token } = await autenticarAdmin(app);
    const cliente = await criarCliente(app);
    const existente = await criarSubordinado(prisma, cliente.id);

    const resposta = await request(app.getHttpServer())
      .post(ROTA)
      .set('Authorization', `Bearer ${token}`)
      .send(montarPayload(cliente.id, { email: existente.email }));

    expect(resposta.status).toBe(422);
    expect(resposta.body.message).toBe('E-mail já cadastrado no sistema.');
  });

  it('responde 422 para documento já cadastrado', async () => {
    const { token } = await autenticarAdmin(app);
    const cliente = await criarCliente(app);
    await criarSubordinado(prisma, cliente.id, { documento: '12345678901' });

    const resposta = await request(app.getHttpServer())
      .post(ROTA)
      .set('Authorization', `Bearer ${token}`)
      .send(montarPayload(cliente.id, { documento: '12345678901' }));

    expect(resposta.status).toBe(422);
    expect(resposta.body.message).toBe('Documento (CPF/CNPJ) já cadastrado no sistema.');
  });
});
