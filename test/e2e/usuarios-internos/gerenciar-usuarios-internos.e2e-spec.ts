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

const ROTA = `${PREFIXO_API}/usuarios-internos`;

describe('Usuários internos (e2e)', () => {
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

  /** Admin autenticado com a feature gerenciar_usuarios_internos liberada. */
  async function autenticarAdmin() {
    await liberarFeature(prisma, Feature.GERENCIAR_USUARIOS_INTERNOS, [Role.ADMIN]);
    return criarUsuarioAutenticado(app, Role.ADMIN);
  }

  /** Usuário com papel(is) ativo(s) em role_user, sem token. */
  async function criarUsuarioComPapeis(papeis: string[]) {
    const { usuario } = await criarUsuarioAutenticado(app, papeis[0]);
    for (const papel of papeis.slice(1)) {
      const role = await buscarOuCriarPapel(prisma, papel);
      await prisma.$executeRaw`
        INSERT INTO role_user (user_id, role_id, ativo) VALUES (${usuario.id}, ${role.id}, true)
      `;
    }
    return usuario;
  }

  function payloadCriacao(sobrescrever: Record<string, unknown> = {}) {
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

  describe('autorização', () => {
    const rotas: Array<[string, 'get' | 'post' | 'put', string]> = [
      ['GET /usuarios-internos', 'get', ROTA],
      ['GET /usuarios-internos/:id', 'get', `${ROTA}/1`],
      ['POST /usuarios-internos', 'post', ROTA],
      ['PUT /usuarios-internos/:id', 'put', `${ROTA}/1`],
    ];

    it.each(rotas)('%s responde 401 sem token', async (_nome, metodo, url) => {
      const resposta = await request(app.getHttpServer())[metodo](url).send({});

      expect(resposta.status).toBe(401);
    });

    it.each(rotas)('%s responde 403 para papel diferente de admin', async (_nome, metodo, url) => {
      await liberarFeature(prisma, Feature.GERENCIAR_USUARIOS_INTERNOS, [Role.CONSULTOR]);
      const { token } = await criarUsuarioAutenticado(app, Role.CONSULTOR);

      const resposta = await request(app.getHttpServer())
        [metodo](url)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(resposta.status).toBe(403);
    });

    it.each(rotas)('%s responde 403 sem a feature liberada', async (_nome, metodo, url) => {
      const { token } = await criarUsuarioAutenticado(app, Role.ADMIN);

      const resposta = await request(app.getHttpServer())
        [metodo](url)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(resposta.status).toBe(403);
      expect(resposta.body.message).toBe(MENSAGEM_SEM_PERMISSAO);
    });
  });

  describe('GET /usuarios-internos', () => {
    it('lista só consultor, produção e recepção sem outros papéis', async () => {
      const { token } = await autenticarAdmin();
      const consultor = await criarUsuarioComPapeis([Role.CONSULTOR]);
      const producao = await criarUsuarioComPapeis([Role.PRODUCAO]);
      const recepcao = await criarUsuarioComPapeis([Role.RECEPCAO]);
      await criarUsuarioComPapeis([Role.CLIENTE]);
      await criarUsuarioComPapeis([Role.EXPEDICAO]);
      await criarUsuarioComPapeis([Role.CONSULTOR, Role.ADMIN]);

      const resposta = await request(app.getHttpServer())
        .get(ROTA)
        .set('Authorization', `Bearer ${token}`);

      expect(resposta.status).toBe(200);
      expect(resposta.body).toMatchObject({
        code: 200,
        status: 'success',
        message: 'Usuários internos carregados com sucesso!',
        pagination: { current_page: 1, last_page: 1, per_page: 10, total: 3 },
      });
      const papelPorId = Object.fromEntries(
        resposta.body.data.map((u: { id: number; papel: string }) => [u.id, u.papel]),
      );
      expect(papelPorId).toEqual({
        [Number(consultor.id)]: Role.CONSULTOR,
        [Number(producao.id)]: Role.PRODUCAO,
        [Number(recepcao.id)]: Role.RECEPCAO,
      });
      expect(resposta.body.data[0]).not.toHaveProperty('senha');
    });

    it('filtra por papel e por busca', async () => {
      const { token } = await autenticarAdmin();
      const recepcao = await criarUsuarioComPapeis([Role.RECEPCAO]);
      await criarUsuarioComPapeis([Role.CONSULTOR]);

      const porPapel = await request(app.getHttpServer())
        .get(ROTA)
        .query({ papel: Role.RECEPCAO })
        .set('Authorization', `Bearer ${token}`);
      const porBusca = await request(app.getHttpServer())
        .get(ROTA)
        .query({ search: recepcao.email })
        .set('Authorization', `Bearer ${token}`);

      expect(porPapel.body.data.map((u: { id: number }) => u.id)).toEqual([Number(recepcao.id)]);
      expect(porBusca.body.data.map((u: { id: number }) => u.id)).toEqual([Number(recepcao.id)]);
    });

    it('responde 400 para papel fora da lista', async () => {
      const { token } = await autenticarAdmin();

      const resposta = await request(app.getHttpServer())
        .get(ROTA)
        .query({ papel: Role.ADMIN })
        .set('Authorization', `Bearer ${token}`);

      expect(resposta.status).toBe(400);
    });
  });

  describe('GET /usuarios-internos/:id', () => {
    it('detalha o usuário interno e responde 404 para cliente', async () => {
      const { token } = await autenticarAdmin();
      const consultor = await criarUsuarioComPapeis([Role.CONSULTOR]);
      const cliente = await criarUsuarioComPapeis([Role.CLIENTE]);

      const encontrado = await request(app.getHttpServer())
        .get(`${ROTA}/${consultor.id}`)
        .set('Authorization', `Bearer ${token}`);
      const naoInterno = await request(app.getHttpServer())
        .get(`${ROTA}/${cliente.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(encontrado.status).toBe(200);
      expect(encontrado.body.data).toMatchObject({
        id: Number(consultor.id),
        email: consultor.email,
        papel: Role.CONSULTOR,
      });
      expect(naoInterno.status).toBe(404);
      expect(naoInterno.body.message).toBe('Usuário interno não encontrado.');
    });
  });

  describe('GET /usuarios-internos/:id — id inválido', () => {
    it('responde 400 para id não numérico', async () => {
      const { token } = await autenticarAdmin();

      const resposta = await request(app.getHttpServer())
        .get(`${ROTA}/abc`)
        .set('Authorization', `Bearer ${token}`);

      expect(resposta.status).toBe(400);
    });
  });

  describe('POST /usuarios-internos', () => {
    it('cria o usuário com senha em hash e papel vinculado', async () => {
      const { token } = await autenticarAdmin();
      await buscarOuCriarPapel(prisma, Role.PRODUCAO);

      const resposta = await request(app.getHttpServer())
        .post(ROTA)
        .set('Authorization', `Bearer ${token}`)
        .send(payloadCriacao());

      expect(resposta.status).toBe(201);
      expect(resposta.body).toMatchObject({
        code: 201,
        status: 'success',
        message: 'Usuário interno criado com sucesso!',
        pagination: null,
      });
      expect(resposta.body.data).toMatchObject({
        email: 'maria.producao@letscom.test',
        papel: Role.PRODUCAO,
        ativo: true,
      });

      const salvo = await prisma.user.findUniqueOrThrow({
        where: { email: 'maria.producao@letscom.test' },
      });
      expect(salvo.senha).not.toBe('senha123');
      await expect(app.get(HashService).check('senha123', salvo.senha)).resolves.toBe(true);
      const papeis = await prisma.$queryRaw<{ nome: string }[]>`
        SELECT r.nome FROM roles r INNER JOIN role_user ru ON ru.role_id = r.id
        WHERE ru.user_id = ${salvo.id} AND ru.ativo = 1
      `;
      expect(papeis.map((p) => p.nome)).toEqual([Role.PRODUCAO]);
    });

    it('responde 409 com e-mail já cadastrado', async () => {
      const { token } = await autenticarAdmin();
      await buscarOuCriarPapel(prisma, Role.PRODUCAO);
      const existente = await criarUsuarioComPapeis([Role.CONSULTOR]);

      const resposta = await request(app.getHttpServer())
        .post(ROTA)
        .set('Authorization', `Bearer ${token}`)
        .send(payloadCriacao({ email: existente.email }));

      expect(resposta.status).toBe(409);
      expect(resposta.body.message).toBe('Já existe um usuário com este e-mail.');
    });

    it('responde 400 com papel inválido', async () => {
      const { token } = await autenticarAdmin();

      const resposta = await request(app.getHttpServer())
        .post(ROTA)
        .set('Authorization', `Bearer ${token}`)
        .send(payloadCriacao({ papel: Role.ADMIN }));

      expect(resposta.status).toBe(400);
    });
  });

  describe('PUT /usuarios-internos/:id', () => {
    it('atualiza dados, senha e inativa sem alterar o e-mail', async () => {
      const { token } = await autenticarAdmin();
      const consultor = await criarUsuarioComPapeis([Role.CONSULTOR]);

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

      const salvo = await prisma.user.findUniqueOrThrow({ where: { id: consultor.id } });
      expect(salvo).toMatchObject({
        nome: 'Consultor Renomeado',
        telefone: '11911112222',
        ativo: false,
        email: consultor.email,
      });
      await expect(app.get(HashService).check('nova-senha', salvo.senha)).resolves.toBe(true);
    });

    it('responde 400 com dados inválidos', async () => {
      const { token } = await autenticarAdmin();
      const consultor = await criarUsuarioComPapeis([Role.CONSULTOR]);

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

    it('responde 409 com telefone de outro usuário', async () => {
      const { token } = await autenticarAdmin();
      const consultor = await criarUsuarioComPapeis([Role.CONSULTOR]);
      const outro = await criarUsuarioComPapeis([Role.RECEPCAO]);

      const resposta = await request(app.getHttpServer())
        .put(`${ROTA}/${consultor.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ telefone: outro.telefone });

      expect(resposta.status).toBe(409);
      expect(resposta.body.message).toBe('Já existe um usuário com este telefone.');
    });

    it('rejeita e-mail no body e mantém o e-mail salvo', async () => {
      const { token } = await autenticarAdmin();
      const consultor = await criarUsuarioComPapeis([Role.CONSULTOR]);

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

    it('responde 404 ao editar cliente por esta rota', async () => {
      const { token } = await autenticarAdmin();
      const cliente = await criarUsuarioComPapeis([Role.CLIENTE]);

      const resposta = await request(app.getHttpServer())
        .put(`${ROTA}/${cliente.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ nome: 'Hack' });

      expect(resposta.status).toBe(404);
    });
  });
});
