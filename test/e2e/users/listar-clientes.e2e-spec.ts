import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Feature } from 'src/shared/auth/features';
import { Role } from 'src/shared/constants/roles';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { criarAppE2e, PREFIXO_API } from '../helpers/criar-app-e2e';
import { buscarOuCriarPapel, criarUsuarioAutenticado } from '../helpers/criar-usuario-autenticado';
import { liberarFeature } from '../helpers/liberar-feature';
import { limparBanco } from '../helpers/limpar-banco';

const ROTA = `${PREFIXO_API}/users`;

describe('GET /users (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let sequencia = 0;

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

  /** Admin autenticado com a feature visualizar_cliente liberada. */
  async function autenticarAdmin() {
    await liberarFeature(prisma, Feature.VISUALIZAR_CLIENTE, [
      Role.ADMIN,
      Role.PRODUCAO,
      Role.CONSULTOR,
    ]);
    return criarUsuarioAutenticado(app, Role.ADMIN);
  }

  async function criarUsuarioComPapel(
    nome: string,
    papel: string,
    { papelAtivo = true, createdAt }: { papelAtivo?: boolean; createdAt?: Date } = {},
  ) {
    sequencia += 1;
    const usuario = await prisma.user.create({
      data: {
        nome,
        createdAt,
        email: `listar${sequencia}@e2e.test`,
        senha: 'nao-usada-no-e2e',
        telefone: `1180000${String(sequencia).padStart(4, '0')}`,
        tipoPessoa: 'J',
      },
    });
    const role = await buscarOuCriarPapel(prisma, papel);
    await prisma.$executeRaw`
      INSERT INTO role_user (user_id, role_id, ativo) VALUES (${usuario.id}, ${role.id}, ${papelAtivo})
    `;
    return usuario;
  }

  it('responde 401 sem token', async () => {
    const resposta = await request(app.getHttpServer()).get(ROTA);

    expect(resposta.status).toBe(401);
  });

  it('responde 403 para papel sem acesso', async () => {
    await liberarFeature(prisma, Feature.VISUALIZAR_CLIENTE, [Role.ADMIN]);
    const { token } = await criarUsuarioAutenticado(app, Role.RECEPCAO);

    const resposta = await request(app.getHttpServer())
      .get(ROTA)
      .set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(403);
  });

  it('lista só usuários com o papel cliente ativo e conta só eles no total', async () => {
    const { token } = await autenticarAdmin();
    const cliente = await criarUsuarioComPapel('Cliente Ativo', Role.CLIENTE);
    await criarUsuarioComPapel('Cliente Com Papel Inativo', Role.CLIENTE, { papelAtivo: false });
    await criarUsuarioComPapel('Produção', Role.PRODUCAO);
    await criarUsuarioComPapel('Consultor', Role.CONSULTOR);

    const resposta = await request(app.getHttpServer())
      .get(ROTA)
      .set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(200);
    expect(resposta.body.data).toHaveLength(1);
    expect(resposta.body.data[0]).toEqual(
      expect.objectContaining({ id: Number(cliente.id), nome: 'Cliente Ativo' }),
    );
    expect(resposta.body.pagination).toEqual(expect.objectContaining({ total: 1 }));
  });

  it('pagina e busca apenas entre os clientes', async () => {
    const { token } = await autenticarAdmin();
    await criarUsuarioComPapel('Empresa Alfa', Role.CLIENTE);
    await criarUsuarioComPapel('Empresa Beta', Role.CLIENTE);
    await criarUsuarioComPapel('Empresa Gama', Role.CLIENTE);
    await criarUsuarioComPapel('Empresa Interna', Role.PRODUCAO);

    const pagina = await request(app.getHttpServer())
      .get(`${ROTA}?page=2&per_page=2`)
      .set('Authorization', `Bearer ${token}`);

    expect(pagina.status).toBe(200);
    expect(pagina.body.data).toHaveLength(1);
    expect(pagina.body.pagination).toEqual(
      expect.objectContaining({ total: 3, current_page: 2, last_page: 2 }),
    );

    const busca = await request(app.getHttpServer())
      .get(`${ROTA}?search=Empresa`)
      .set('Authorization', `Bearer ${token}`);

    expect(busca.body.data.map((usuario: { nome: string }) => usuario.nome).sort()).toEqual([
      'Empresa Alfa',
      'Empresa Beta',
      'Empresa Gama',
    ]);
  });

  it('responde 400 com order inválido', async () => {
    const { token } = await autenticarAdmin();

    const resposta = await request(app.getHttpServer())
      .get(`${ROTA}?order=invalido`)
      .set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(400);
  });

  it('ordena por nome quando sort_by está na whitelist', async () => {
    const { token } = await autenticarAdmin();
    await criarUsuarioComPapel('Charlie', Role.CLIENTE);
    await criarUsuarioComPapel('Alfa', Role.CLIENTE);
    await criarUsuarioComPapel('Bravo', Role.CLIENTE);

    const resposta = await request(app.getHttpServer())
      .get(`${ROTA}?sort_by=nome&order=asc`)
      .set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(200);
    expect(resposta.body.data.map((usuario: { nome: string }) => usuario.nome)).toEqual([
      'Alfa',
      'Bravo',
      'Charlie',
    ]);
  });

  it('ignora sort_by fora da whitelist e ordena por created_at desc', async () => {
    const { token } = await autenticarAdmin();
    await criarUsuarioComPapel('Mais Antigo', Role.CLIENTE, {
      createdAt: new Date('2026-01-01T10:00:00Z'),
    });
    await criarUsuarioComPapel('Mais Recente', Role.CLIENTE, {
      createdAt: new Date('2026-02-01T10:00:00Z'),
    });

    const resposta = await request(app.getHttpServer())
      .get(`${ROTA}?sort_by=${encodeURIComponent('nome;DROP TABLE users')}`)
      .set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(200);
    expect(resposta.body.data.map((usuario: { nome: string }) => usuario.nome)).toEqual([
      'Mais Recente',
      'Mais Antigo',
    ]);
  });

  it('busca cliente pelo id e não encontra usuário interno pelo id', async () => {
    const { token } = await autenticarAdmin();
    const cliente = await criarUsuarioComPapel('Cliente Buscado', Role.CLIENTE);
    const interno = await criarUsuarioComPapel('Usuário Produção', Role.PRODUCAO);

    const porIdCliente = await request(app.getHttpServer())
      .get(`${ROTA}?search=${cliente.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(porIdCliente.status).toBe(200);
    expect(porIdCliente.body.data.map((usuario: { id: number }) => usuario.id)).toContain(
      Number(cliente.id),
    );

    const porIdInterno = await request(app.getHttpServer())
      .get(`${ROTA}?search=${interno.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(porIdInterno.status).toBe(200);
    expect(porIdInterno.body.data).toEqual([]);
    expect(porIdInterno.body.pagination).toEqual(expect.objectContaining({ total: 0 }));
  });

  it('busca cliente pelo telefone', async () => {
    const { token } = await autenticarAdmin();
    const cliente = await criarUsuarioComPapel('Cliente Telefone', Role.CLIENTE);

    const resposta = await request(app.getHttpServer())
      .get(`${ROTA}?search=${cliente.telefone}`)
      .set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(200);
    expect(resposta.body.data.map((usuario: { id: number }) => usuario.id)).toEqual([
      Number(cliente.id),
    ]);
  });
});
