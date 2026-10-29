import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Feature, MENSAGEM_SEM_PERMISSAO } from 'src/shared/auth/features';
import { Role } from 'src/shared/constants/roles';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { HashService } from 'src/shared/utils/hash.service';
import { criarAppE2e, PREFIXO_API } from '../helpers/criar-app-e2e';
import { buscarOuCriarPapel, criarUsuarioAutenticado } from '../helpers/criar-usuario-autenticado';
import { liberarFeature } from '../helpers/liberar-feature';
import { limparBanco } from '../helpers/limpar-banco';

const ROTA = `${PREFIXO_API}/usuarios-cliente`;

const FEATURES_USUARIO_CLIENTE = [
  Feature.VISUALIZAR_USUARIO_CLIENTE,
  Feature.CRIAR_USUARIO_CLIENTE,
  Feature.EDITAR_USUARIOS_CLIENTE,
  Feature.INATIVAR_USUARIO_CLIENTE,
];

describe('Usuários do cliente (e2e)', () => {
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

  /** Admin autenticado com as features informadas liberadas (default: todas do recurso). */
  async function autenticarAdmin(features: string[] = FEATURES_USUARIO_CLIENTE) {
    for (const feature of features) {
      await liberarFeature(prisma, feature, [Role.ADMIN, Role.PRODUCAO, Role.CONSULTOR]);
    }
    return criarUsuarioAutenticado(app, Role.ADMIN);
  }

  /** Cliente principal (tabela users) sem token. */
  async function criarCliente() {
    const { usuario } = await criarUsuarioAutenticado(app, Role.CLIENTE);
    return usuario;
  }

  async function criarSubordinado(clienteId: bigint, dados: { nome?: string } = {}) {
    sequencia += 1;
    return prisma.userCliente.create({
      data: {
        clienteId,
        email: `sub${sequencia}@e2e.test`,
        nome: dados.nome ?? `Subordinado ${sequencia}`,
        senha: 'nao-usada-no-e2e',
      },
    });
  }

  describe('autorização', () => {
    const rotas: Array<[string, 'get' | 'post' | 'put' | 'delete', string]> = [
      ['GET /usuarios-cliente', 'get', ROTA],
      ['GET /usuarios-cliente/cliente/:id', 'get', `${ROTA}/cliente/1`],
      ['GET /usuarios-cliente/:id', 'get', `${ROTA}/1`],
      ['POST /usuarios-cliente', 'post', ROTA],
      ['PUT /usuarios-cliente/:id', 'put', `${ROTA}/1`],
      ['DELETE /usuarios-cliente/:id', 'delete', `${ROTA}/1`],
    ];

    it.each(rotas)('%s responde 401 sem token', async (_nome, metodo, url) => {
      const resposta = await request(app.getHttpServer())[metodo](url).send({});

      expect(resposta.status).toBe(401);
    });

    it.each(rotas)('%s responde 403 para papel sem acesso', async (_nome, metodo, url) => {
      for (const feature of FEATURES_USUARIO_CLIENTE) {
        await liberarFeature(prisma, feature, [Role.RECEPCAO]);
      }
      const { token } = await criarUsuarioAutenticado(app, Role.RECEPCAO);

      const resposta = await request(app.getHttpServer())
        [metodo](url)
        .set('Authorization', `Bearer ${token}`)
        .send({ nome: 'X' });

      expect(resposta.status).toBe(403);
    });

    it.each(rotas)('%s responde 403 sem a feature liberada', async (_nome, metodo, url) => {
      const { token } = await criarUsuarioAutenticado(app, Role.ADMIN);

      const resposta = await request(app.getHttpServer())
        [metodo](url)
        .set('Authorization', `Bearer ${token}`)
        .send({ nome: 'X' });

      expect(resposta.status).toBe(403);
      expect(resposta.body.message).toBe(MENSAGEM_SEM_PERMISSAO);
    });
  });

  describe('GET /usuarios-cliente', () => {
    it('lista todos os subordinados sem expor a senha', async () => {
      const { token } = await autenticarAdmin();
      const cliente = await criarCliente();
      const primeiro = await criarSubordinado(cliente.id);
      const segundo = await criarSubordinado(cliente.id);

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

  describe('GET /usuarios-cliente/cliente/:id', () => {
    it('pagina e busca só os subordinados do cliente', async () => {
      const { token } = await autenticarAdmin();
      const cliente = await criarCliente();
      const outroCliente = await criarCliente();
      await criarSubordinado(cliente.id, { nome: 'Ana' });
      await criarSubordinado(cliente.id, { nome: 'Bruno' });
      await criarSubordinado(cliente.id, { nome: 'Carla' });
      await criarSubordinado(outroCliente.id, { nome: 'Ana de Outro Cliente' });

      const pagina = await request(app.getHttpServer())
        .get(`${ROTA}/cliente/${cliente.id}?page=2&per_page=2&sort_by=nome&order=asc`)
        .set('Authorization', `Bearer ${token}`);
      const busca = await request(app.getHttpServer())
        .get(`${ROTA}/cliente/${cliente.id}?search=Ana`)
        .set('Authorization', `Bearer ${token}`);

      expect(pagina.status).toBe(200);
      expect(pagina.body.data.map((usuario: { nome: string }) => usuario.nome)).toEqual(['Carla']);
      expect(pagina.body.pagination).toEqual(
        expect.objectContaining({ total: 3, current_page: 2, last_page: 2 }),
      );
      expect(busca.body.data.map((usuario: { nome: string }) => usuario.nome)).toEqual(['Ana']);
    });

    it('responde 400 com order inválido', async () => {
      const { token } = await autenticarAdmin();

      const resposta = await request(app.getHttpServer())
        .get(`${ROTA}/cliente/1?order=invalido`)
        .set('Authorization', `Bearer ${token}`);

      expect(resposta.status).toBe(400);
    });
  });

  describe('GET /usuarios-cliente/:id', () => {
    it('detalha o subordinado e devolve data null quando não existe', async () => {
      const { token } = await autenticarAdmin();
      const cliente = await criarCliente();
      const subordinado = await criarSubordinado(cliente.id);

      const encontrado = await request(app.getHttpServer())
        .get(`${ROTA}/${subordinado.id}`)
        .set('Authorization', `Bearer ${token}`);
      const inexistente = await request(app.getHttpServer())
        .get(`${ROTA}/999999`)
        .set('Authorization', `Bearer ${token}`);

      expect(encontrado.status).toBe(200);
      expect(encontrado.body.data).toMatchObject({
        id: Number(subordinado.id),
        cliente_id: Number(cliente.id),
        email: subordinado.email,
      });
      expect(encontrado.body.data).not.toHaveProperty('senha');
      expect(inexistente.status).toBe(200);
      expect(inexistente.body.data).toBeNull();
    });
  });

  describe('POST /usuarios-cliente', () => {
    it('cria o subordinado com senha em hash e papel subordinado', async () => {
      const { token } = await autenticarAdmin();
      const cliente = await criarCliente();
      const papelSubordinado = await buscarOuCriarPapel(prisma, Role.SUBORDINADO);

      const resposta = await request(app.getHttpServer())
        .post(ROTA)
        .set('Authorization', `Bearer ${token}`)
        .send({
          cliente_id: Number(cliente.id),
          email: 'novo.sub@empresa.test',
          senha: 'senha123',
          nome: 'Novo Sub',
          ativo: '0',
        });

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
      expect(persistido.senha).not.toBe('senha123');
      await expect(app.get(HashService).check('senha123', persistido.senha)).resolves.toBe(true);
      const papeis = await prisma.$queryRaw<Array<{ role_id: bigint }>>`
        SELECT role_id FROM role_user WHERE client_sub_id = ${persistido.id}
      `;
      expect(papeis.map((papel) => papel.role_id)).toEqual([papelSubordinado.id]);
    });

    it('responde 422 para e-mail já cadastrado', async () => {
      const { token } = await autenticarAdmin();
      const cliente = await criarCliente();
      const existente = await criarSubordinado(cliente.id);

      const resposta = await request(app.getHttpServer())
        .post(ROTA)
        .set('Authorization', `Bearer ${token}`)
        .send({ cliente_id: Number(cliente.id), email: existente.email, senha: 'senha123' });

      expect(resposta.status).toBe(422);
      expect(resposta.body.message).toBe('E-mail já cadastrado no sistema.');
    });

    it('responde 422 para documento já cadastrado', async () => {
      const { token } = await autenticarAdmin();
      const cliente = await criarCliente();
      await prisma.userCliente.create({
        data: {
          clienteId: cliente.id,
          email: 'com.documento@e2e.test',
          senha: 'nao-usada-no-e2e',
          documento: '12345678901',
        },
      });

      const resposta = await request(app.getHttpServer())
        .post(ROTA)
        .set('Authorization', `Bearer ${token}`)
        .send({
          cliente_id: Number(cliente.id),
          email: 'outro@e2e.test',
          senha: 'senha123',
          documento: '12345678901',
        });

      expect(resposta.status).toBe(422);
      expect(resposta.body.message).toBe('Documento (CPF/CNPJ) já cadastrado no sistema.');
    });

    it('responde 400 com DTO inválido', async () => {
      const { token } = await autenticarAdmin();

      const resposta = await request(app.getHttpServer())
        .post(ROTA)
        .set('Authorization', `Bearer ${token}`)
        .send({ cliente_id: 1, email: 'nao-e-email', senha: '123' });

      expect(resposta.status).toBe(400);
    });
  });

  describe('PUT /usuarios-cliente/:id', () => {
    it('atualiza nome e ativo com as duas features liberadas', async () => {
      const { token } = await autenticarAdmin();
      const cliente = await criarCliente();
      const subordinado = await criarSubordinado(cliente.id);

      const resposta = await request(app.getHttpServer())
        .put(`${ROTA}/${subordinado.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ nome: 'Nome Atualizado', ativo: false });

      expect(resposta.status).toBe(200);
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
      const { token } = await autenticarAdmin([Feature.EDITAR_USUARIOS_CLIENTE]);
      const cliente = await criarCliente();
      const subordinado = await criarSubordinado(cliente.id);

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
      const { token } = await autenticarAdmin();

      const resposta = await request(app.getHttpServer())
        .put(`${ROTA}/999999`)
        .set('Authorization', `Bearer ${token}`)
        .send({ nome: 'X' });

      expect(resposta.status).toBe(404);
      expect(resposta.body.message).toBe('Usuário não encontrado.');
    });

    it('responde 400 com DTO inválido', async () => {
      const { token } = await autenticarAdmin();

      const resposta = await request(app.getHttpServer())
        .put(`${ROTA}/1`)
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'nao-e-email' });

      expect(resposta.status).toBe(400);
    });
  });

  describe('DELETE /usuarios-cliente/:id', () => {
    it('exclui o subordinado sem remessas', async () => {
      const { token } = await autenticarAdmin();
      const cliente = await criarCliente();
      const subordinado = await criarSubordinado(cliente.id);

      const resposta = await request(app.getHttpServer())
        .delete(`${ROTA}/${subordinado.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(resposta.status).toBe(200);
      expect(resposta.body).toMatchObject({
        message: 'Usuário do cliente removido com sucesso!',
        data: [],
      });
      await expect(
        prisma.userCliente.findUnique({ where: { id: subordinado.id } }),
      ).resolves.toBeNull();
    });

    it('responde 422 quando o subordinado não existe', async () => {
      const { token } = await autenticarAdmin();

      const resposta = await request(app.getHttpServer())
        .delete(`${ROTA}/999999`)
        .set('Authorization', `Bearer ${token}`);

      expect(resposta.status).toBe(422);
      expect(resposta.body.message).toBe('Usuário não encontrado.');
    });
  });
});
