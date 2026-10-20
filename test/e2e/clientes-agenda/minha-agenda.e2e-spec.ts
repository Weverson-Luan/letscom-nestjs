import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { JwtTokenService } from 'src/modules/auth/services/jwt-token.service';
import { Feature, MENSAGEM_SEM_PERMISSAO } from 'src/shared/auth/features';
import { Role } from 'src/shared/constants/roles';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { criarAppE2e, PREFIXO_API } from '../helpers/criar-app-e2e';
import { buscarOuCriarPapel, criarUsuarioAutenticado } from '../helpers/criar-usuario-autenticado';
import { liberarFeature } from '../helpers/liberar-feature';
import { limparBanco } from '../helpers/limpar-banco';

const ROTA = `${PREFIXO_API}/minha-agenda`;

describe('GET /minha-agenda (e2e)', () => {
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

  /** Subordinado (users_cliente) com papel ativo e token de login-subordinado. */
  async function criarSubordinadoAutenticado(clienteId: bigint) {
    const subordinado = await prisma.userCliente.create({
      data: {
        clienteId,
        email: `compras${clienteId}@e2e.test`,
        nome: 'Compras',
        senha: 'nao-usada',
      },
    });
    const papel = await buscarOuCriarPapel(prisma, Role.SUBORDINADO);
    await prisma.$executeRaw`
      INSERT INTO role_user (client_sub_id, role_id, ativo) VALUES (${subordinado.id}, ${papel.id}, true)
    `;
    const token = app.get(JwtTokenService, { strict: false }).createToken({
      sub: subordinado.id,
      tipo_login: 'subordinado',
      email: subordinado.email,
    });
    return { subordinado, token };
  }

  async function prepararCenario() {
    await liberarFeature(prisma, Feature.ACESSAR_AGENDA_CLIENTE, [Role.CLIENTE, Role.SUBORDINADO]);
    const { usuario: consultor } = await criarUsuarioAutenticado(app, Role.CONSULTOR);
    const cliente = await criarUsuarioAutenticado(app, Role.CLIENTE);
    const { usuario: outroCliente } = await criarUsuarioAutenticado(app, Role.CLIENTE);

    const base = { autorId: consultor.id, responsavelId: consultor.id };
    await prisma.clienteCompromisso.createMany({
      data: [
        {
          ...base,
          clienteId: cliente.usuario.id,
          titulo: 'Visível',
          agendadoPara: new Date('2026-10-21T14:00:00.000Z'),
          visivelCliente: true,
        },
        {
          ...base,
          clienteId: cliente.usuario.id,
          titulo: 'Interno',
          agendadoPara: new Date('2026-10-20T14:00:00.000Z'),
          visivelCliente: false,
        },
        {
          ...base,
          clienteId: cliente.usuario.id,
          titulo: 'Visível excluído',
          agendadoPara: new Date('2026-10-22T14:00:00.000Z'),
          visivelCliente: true,
          deletedAt: new Date(),
        },
        {
          ...base,
          clienteId: outroCliente.id,
          titulo: 'De outra empresa',
          agendadoPara: new Date('2026-10-19T14:00:00.000Z'),
          visivelCliente: true,
        },
      ],
    });

    return { consultor, cliente };
  }

  it('responde 401 sem token', async () => {
    const resposta = await request(app.getHttpServer()).get(ROTA);
    expect(resposta.status).toBe(401);
  });

  it('responde 403 para papel interno, mesmo com a feature', async () => {
    await liberarFeature(prisma, Feature.ACESSAR_AGENDA_CLIENTE, [Role.CONSULTOR]);
    const { token } = await criarUsuarioAutenticado(app, Role.CONSULTOR);

    const resposta = await request(app.getHttpServer())
      .get(ROTA)
      .set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(403);
  });

  it('responde 403 para cliente sem a feature liberada', async () => {
    const { token } = await criarUsuarioAutenticado(app, Role.CLIENTE);

    const resposta = await request(app.getHttpServer())
      .get(ROTA)
      .set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(403);
    expect(resposta.body.message).toBe(MENSAGEM_SEM_PERMISSAO);
  });

  it('responde 400 com filtro inválido', async () => {
    await prepararCenario();
    const { token } = await criarUsuarioAutenticado(app, Role.CLIENTE);

    const resposta = await request(app.getHttpServer())
      .get(ROTA)
      .query({ tipo: 'almoco' })
      .set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(400);
  });

  it('cliente principal vê só os visíveis e não excluídos da própria empresa, sem autor', async () => {
    const { consultor, cliente } = await prepararCenario();

    const resposta = await request(app.getHttpServer())
      .get(ROTA)
      .set('Authorization', `Bearer ${cliente.token}`);

    expect(resposta.status).toBe(200);
    expect(resposta.body.message).toBe('Agenda carregada com sucesso!');
    expect(resposta.body.data).toEqual([
      {
        id: expect.any(Number),
        cliente_id: Number(cliente.usuario.id),
        tipo: 'nota',
        titulo: 'Visível',
        descricao: null,
        agendado_para: '2026-10-21T14:00:00.000Z',
        status: 'pendente',
        concluido_em: null,
        atrasado: expect.any(Boolean),
        responsavel: { tipo: 'interno', id: Number(consultor.id), nome: consultor.nome },
        created_at: expect.any(String),
        updated_at: expect.any(String),
      },
    ]);
    expect(resposta.body.pagination).toEqual({
      current_page: 1,
      last_page: 1,
      per_page: 20,
      total: 1,
    });
  });

  it('subordinado vê a agenda da empresa dele (empresa vem do token)', async () => {
    const { cliente } = await prepararCenario();
    const { token } = await criarSubordinadoAutenticado(cliente.usuario.id);

    const resposta = await request(app.getHttpServer())
      .get(ROTA)
      .set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(200);
    expect(resposta.body.data.map((c: { titulo: string }) => c.titulo)).toEqual(['Visível']);
  });

  it('leitura não altera o banco', async () => {
    const { cliente } = await prepararCenario();

    await request(app.getHttpServer()).get(ROTA).set('Authorization', `Bearer ${cliente.token}`);

    expect(await prisma.clienteCompromisso.count()).toBe(4);
  });
});
