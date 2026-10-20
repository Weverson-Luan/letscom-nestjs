import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Feature, MENSAGEM_SEM_PERMISSAO } from 'src/shared/auth/features';
import { Role } from 'src/shared/constants/roles';
import { JwtTokenService } from 'src/modules/auth/services/jwt-token.service';
import { TOKENABLE_USER } from 'src/modules/auth/repositories/refresh-token.repository';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { criarAppE2e, PREFIXO_API } from '../helpers/criar-app-e2e';
import { buscarOuCriarPapel, criarUsuarioAutenticado } from '../helpers/criar-usuario-autenticado';
import { liberarFeature } from '../helpers/liberar-feature';
import { limparBanco } from '../helpers/limpar-banco';

const ROTA = `${PREFIXO_API}/auth/codigo-acesso-backoffice`;

describe('Acesso ao backoffice com código de uso único (e2e)', () => {
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

  async function gerarCodigo(token: string) {
    return request(app.getHttpServer()).post(ROTA).set('Authorization', `Bearer ${token}`);
  }

  /** Subordinado (users_cliente) com papel ativo e token de login-subordinado. */
  async function criarSubordinadoAutenticado() {
    const { usuario: cliente } = await criarUsuarioAutenticado(app, Role.CLIENTE);
    const subordinado = await prisma.userCliente.create({
      data: {
        clienteId: cliente.id,
        email: 'subordinado@e2e.test',
        nome: 'Compras',
        senha: 'nao-usada',
      },
    });
    const papel = await buscarOuCriarPapel(prisma, Role.SUBORDINADO);
    await prisma.$executeRaw`
      INSERT INTO role_user (client_sub_id, role_id, ativo) VALUES (${subordinado.id}, ${papel.id}, true)
    `;
    return app.get(JwtTokenService, { strict: false }).createToken({
      sub: subordinado.id,
      tipo_login: 'subordinado',
      email: subordinado.email,
    });
  }

  function trocarCodigo(codigo: string) {
    return request(app.getHttpServer()).post(`${ROTA}/trocar`).send({ codigo });
  }

  describe('POST /auth/codigo-acesso-backoffice', () => {
    it('responde 401 sem token', async () => {
      const resposta = await request(app.getHttpServer()).post(ROTA);

      expect(resposta.status).toBe(401);
    });

    it('responde 403 sem a feature acessar_backoffice', async () => {
      const { token } = await criarUsuarioAutenticado(app, Role.ADMIN);

      const resposta = await gerarCodigo(token);

      expect(resposta.status).toBe(403);
      expect(resposta.body.message).toBe(MENSAGEM_SEM_PERMISSAO);
    });

    it('responde 403 para cliente', async () => {
      await liberarFeature(prisma, Feature.ACESSAR_BACKOFFICE, [Role.ADMIN]);
      const { token } = await criarUsuarioAutenticado(app, Role.CLIENTE);

      const resposta = await gerarCodigo(token);

      expect(resposta.status).toBe(403);
    });

    it('responde 403 para subordinado mesmo com a feature liberada para o papel', async () => {
      await liberarFeature(prisma, Feature.ACESSAR_BACKOFFICE, [Role.SUBORDINADO]);
      const token = await criarSubordinadoAutenticado();

      const resposta = await gerarCodigo(token);

      expect(resposta.status).toBe(403);
      expect(resposta.body.message).toBe(MENSAGEM_SEM_PERMISSAO);
    });

    it('gera o código para usuário interno com a feature', async () => {
      await liberarFeature(prisma, Feature.ACESSAR_BACKOFFICE, [Role.ADMIN]);
      const { token } = await criarUsuarioAutenticado(app, Role.ADMIN);

      const resposta = await gerarCodigo(token);

      expect(resposta.status).toBe(200);
      expect(resposta.headers['cache-control']).toBe('no-store');
      expect(resposta.body.data.codigo).toMatch(/^[0-9a-f]{64}$/);
      expect(resposta.body.data.expira_em_segundos).toBe(60);
    });
  });

  describe('POST /auth/codigo-acesso-backoffice/trocar', () => {
    it('troca o código pela sessão do mesmo usuário', async () => {
      await liberarFeature(prisma, Feature.ACESSAR_BACKOFFICE, [Role.ADMIN]);
      const { usuario, token } = await criarUsuarioAutenticado(app, Role.ADMIN);
      const { body } = await gerarCodigo(token);

      const resposta = await trocarCodigo(body.data.codigo);

      expect(resposta.status).toBe(200);
      expect(resposta.body.data).toMatchObject({
        id: Number(usuario.id),
        email: usuario.email,
        tipo_login: 'user',
        features: [Feature.ACESSAR_BACKOFFICE],
      });
      expect(resposta.headers['cache-control']).toBe('no-store');
      expect(resposta.body.access_token).toEqual(expect.any(String));
      expect(resposta.body.refresh_token).toEqual(expect.any(String));

      const refreshTokens = await prisma.refreshToken.findMany({
        where: { tokenableType: TOKENABLE_USER, tokenableId: usuario.id, revokedAt: null },
      });
      expect(refreshTokens).toHaveLength(1);
    });

    it('trocas simultâneas do mesmo código: só uma recebe sessão', async () => {
      await liberarFeature(prisma, Feature.ACESSAR_BACKOFFICE, [Role.ADMIN]);
      const { token } = await criarUsuarioAutenticado(app, Role.ADMIN);
      const { body } = await gerarCodigo(token);

      const respostas = await Promise.all([
        trocarCodigo(body.data.codigo),
        trocarCodigo(body.data.codigo),
        trocarCodigo(body.data.codigo),
      ]);

      expect(respostas.map((r) => r.status).sort()).toEqual([200, 401, 401]);
    });

    it('o access token emitido acessa rota do backoffice', async () => {
      await liberarFeature(prisma, Feature.ACESSAR_BACKOFFICE, [Role.ADMIN]);
      const { token } = await criarUsuarioAutenticado(app, Role.ADMIN);
      const { body } = await gerarCodigo(token);
      const troca = await trocarCodigo(body.data.codigo);

      const resposta = await request(app.getHttpServer())
        .get(`${PREFIXO_API}/dashboard/overview`)
        .set('Authorization', `Bearer ${troca.body.access_token}`);

      expect(resposta.status).toBe(200);
    });

    it('o código só pode ser usado uma vez', async () => {
      await liberarFeature(prisma, Feature.ACESSAR_BACKOFFICE, [Role.ADMIN]);
      const { token } = await criarUsuarioAutenticado(app, Role.ADMIN);
      const { body } = await gerarCodigo(token);

      await trocarCodigo(body.data.codigo).expect(200);
      const segunda = await trocarCodigo(body.data.codigo);

      expect(segunda.status).toBe(401);
    });

    it('responde 401 para código desconhecido', async () => {
      const resposta = await trocarCodigo('b'.repeat(64));

      expect(resposta.status).toBe(401);
    });

    it('responde 400 para código fora do formato', async () => {
      const resposta = await trocarCodigo('nao-e-hex');

      expect(resposta.status).toBe(400);
    });

    it('responde 403 quando a feature foi removida depois da geração do código', async () => {
      const flag = await liberarFeature(prisma, Feature.ACESSAR_BACKOFFICE, [Role.ADMIN]);
      const { token } = await criarUsuarioAutenticado(app, Role.ADMIN);
      const { body } = await gerarCodigo(token);
      await prisma.featureFlag.update({ where: { id: flag.id }, data: { ativo: false } });

      const resposta = await trocarCodigo(body.data.codigo);

      expect(resposta.status).toBe(403);
    });
  });
});
