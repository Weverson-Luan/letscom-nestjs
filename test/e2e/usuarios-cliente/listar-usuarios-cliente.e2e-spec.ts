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
  ROTA_USUARIOS_CLIENTE as ROTA,
} from './usuarios-cliente.fixtures';

describe('GET /usuarios-cliente (e2e)', () => {
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

  it('responde 403 para papel sem acesso', async () => {
    const { token } = await autenticarPapelSemAcesso(app);

    const resposta = await request(app.getHttpServer())
      .get(ROTA)
      .set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(403);
  });

  it('responde 403 sem a feature liberada', async () => {
    const { token } = await criarUsuarioAutenticado(app, Role.ADMIN);

    const resposta = await request(app.getHttpServer())
      .get(ROTA)
      .set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(403);
    expect(resposta.body.message).toBe(MENSAGEM_SEM_PERMISSAO);
  });

  it('lista todos os subordinados, do mais recente ao mais antigo, sem expor a senha', async () => {
    const { token } = await autenticarAdmin(app);
    const cliente = await criarCliente(app);
    const primeiro = await criarSubordinado(prisma, cliente.id);
    const segundo = await criarSubordinado(prisma, cliente.id);

    const resposta = await request(app.getHttpServer())
      .get(ROTA)
      .set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(200);
    expect(resposta.body.message).toBe('Usuários do cliente carregados com sucesso!');
    expect(resposta.body.data.map((usuario: { id: number }) => usuario.id)).toEqual([
      Number(segundo.id),
      Number(primeiro.id),
    ]);
    expect(resposta.body.data[0]).toEqual({
      id: Number(segundo.id),
      cliente_id: Number(cliente.id),
      email: segundo.email,
      nome: segundo.nome,
      ativo: true,
      created_at: expect.any(String),
      updated_at: expect.any(String),
    });
  });
});
