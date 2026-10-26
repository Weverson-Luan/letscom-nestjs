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

  async function criarUsuarioComPapel(nome: string, papel: string, papelAtivo = true) {
    sequencia += 1;
    const usuario = await prisma.user.create({
      data: {
        nome,
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
    await criarUsuarioComPapel('Cliente Com Papel Inativo', Role.CLIENTE, false);
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
});
