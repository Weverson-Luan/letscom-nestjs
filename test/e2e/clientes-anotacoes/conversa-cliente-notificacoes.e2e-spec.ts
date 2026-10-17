import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { JwtTokenService } from 'src/modules/auth/services/jwt-token.service';
import { Feature } from 'src/shared/auth/features';
import { Role } from 'src/shared/constants/roles';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { StorageService } from 'src/shared/storage/storage.service';
import { criarAppE2e, PREFIXO_API } from '../helpers/criar-app-e2e';
import { buscarOuCriarPapel, criarUsuarioAutenticado } from '../helpers/criar-usuario-autenticado';
import { liberarFeature } from '../helpers/liberar-feature';
import { limparBanco } from '../helpers/limpar-banco';

const MINHAS = `${PREFIXO_API}/minhas-anotacoes`;
const NOTIFICACOES = `${PREFIXO_API}/notificacoes`;
const PAPEIS_INTERNOS = [Role.ADMIN, Role.CONSULTOR, Role.PRODUCAO, Role.RECEPCAO];

describe('Conversa com o cliente e notificações (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const arquivos = new Map<string, Buffer>();
  const storage = {
    put: jest.fn(async (caminho: string, conteudo: Buffer) => {
      arquivos.set(caminho, conteudo);
      return caminho;
    }),
    download: jest.fn(async (caminho: string) => arquivos.get(caminho) ?? null),
    delete: jest.fn(async (caminho: string) => {
      arquivos.delete(caminho);
    }),
  };

  beforeAll(async () => {
    app = await criarAppE2e((b) => b.overrideProvider(StorageService).useValue(storage));
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await limparBanco(prisma);
    arquivos.clear();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app?.close();
  });

  /** Subordinado (users_cliente) com papel ativo e token de login-subordinado. */
  async function criarSubordinadoAutenticado(clienteId: bigint, email = 'compras@cliente.test') {
    const subordinado = await prisma.userCliente.create({
      data: { clienteId, email, nome: 'Compras', senha: 'nao-usada' },
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
    await liberarFeature(prisma, Feature.VISUALIZAR_ANOTACOES_CLIENTE, PAPEIS_INTERNOS);
    await liberarFeature(prisma, Feature.REGISTRAR_ANOTACOES_CLIENTE, PAPEIS_INTERNOS);
    await liberarFeature(prisma, Feature.RESPONDER_ANOTACOES_CLIENTE, [
      Role.CLIENTE,
      Role.SUBORDINADO,
    ]);
    const consultor = await criarUsuarioAutenticado(app, Role.CONSULTOR);
    const outroInterno = await criarUsuarioAutenticado(app, Role.PRODUCAO);
    const cliente = await criarUsuarioAutenticado(app, Role.CLIENTE);
    await prisma.clienteConsultor.create({
      data: { clienteId: cliente.usuario.id, consultorId: consultor.usuario.id },
    });
    const sub = await criarSubordinadoAutenticado(cliente.usuario.id);
    return { consultor, outroInterno, cliente, sub };
  }

  describe('autorização de /minhas-anotacoes', () => {
    const rotas: Array<[string, 'get' | 'post', string]> = [
      ['GET', 'get', MINHAS],
      ['POST', 'post', MINHAS],
      ['GET anexo', 'get', `${MINHAS}/1/anexos/1`],
    ];

    it.each(rotas)('%s responde 401 sem token', async (_nome, metodo, url) => {
      const resposta = await request(app.getHttpServer())[metodo](url);
      expect(resposta.status).toBe(401);
    });

    it.each(rotas)('%s responde 403 para interno', async (_nome, metodo, url) => {
      const { consultor } = await prepararCenario();
      const resposta = await request(app.getHttpServer())
        [metodo](url)
        .set('Authorization', `Bearer ${consultor.token}`);
      expect(resposta.status).toBe(403);
    });

    it.each(rotas)('%s responde 403 sem a feature', async (_nome, metodo, url) => {
      const cliente = await criarUsuarioAutenticado(app, Role.CLIENTE);
      const resposta = await request(app.getHttpServer())
        [metodo](url)
        .set('Authorization', `Bearer ${cliente.token}`);
      expect(resposta.status).toBe(403);
    });

    it('400 com filtro inválido e com id não numérico no anexo', async () => {
      const { cliente } = await prepararCenario();

      const filtro = await request(app.getHttpServer())
        .get(`${MINHAS}?tipo=invalido`)
        .set('Authorization', `Bearer ${cliente.token}`);
      const anexo = await request(app.getHttpServer())
        .get(`${MINHAS}/abc/anexos/1`)
        .set('Authorization', `Bearer ${cliente.token}`);

      expect(filtro.status).toBe(400);
      expect(anexo.status).toBe(400);
    });

    it('cliente não acessa a rota interna de anotações', async () => {
      const { cliente } = await prepararCenario();
      const resposta = await request(app.getHttpServer())
        .get(`${PREFIXO_API}/clientes/${cliente.usuario.id}/anotacoes`)
        .set('Authorization', `Bearer ${cliente.token}`);
      expect(resposta.status).toBe(403);
    });
  });

  it('equipe escreve → cliente e subordinado são notificados e veem tudo', async () => {
    const { consultor, cliente, sub } = await prepararCenario();

    const criada = await request(app.getHttpServer())
      .post(`${PREFIXO_API}/clientes/${cliente.usuario.id}/anotacoes`)
      .set('Authorization', `Bearer ${consultor.token}`)
      .field('conteudo', 'Segue a proposta.')
      .attach('anexos', Buffer.from('%PDF'), 'proposta.pdf');
    expect(criada.status).toBe(201);

    const notificacoes = await prisma.notificacao.findMany({ orderBy: { id: 'asc' } });
    expect(notificacoes).toEqual([
      expect.objectContaining({
        destinatarioUserId: cliente.usuario.id,
        link: '/minhas-anotacoes',
        titulo: 'Nova mensagem da equipe Letscom',
      }),
      expect.objectContaining({ destinatarioSubordinadoId: sub.subordinado.id }),
    ]);

    const lista = await request(app.getHttpServer())
      .get(MINHAS)
      .set('Authorization', `Bearer ${sub.token}`);
    expect(lista.status).toBe(200);
    expect(lista.body.data).toEqual([
      expect.objectContaining({
        conteudo: 'Segue a proposta.',
        autor: expect.objectContaining({ tipo: 'interno' }),
        eh_minha: false,
        pode_editar: false,
        pode_excluir: false,
      }),
    ]);

    const anexo = criada.body.data.anexos[0];
    const baixado = await request(app.getHttpServer())
      .get(`${MINHAS}/${criada.body.data.id}/anexos/${anexo.id}`)
      .set('Authorization', `Bearer ${sub.token}`)
      .buffer(true);
    expect(baixado.status).toBe(200);
    expect(baixado.headers['content-disposition']).toContain('proposta.pdf');

    const contagem = await request(app.getHttpServer())
      .get(`${NOTIFICACOES}/nao-lidas/contagem`)
      .set('Authorization', `Bearer ${sub.token}`);
    expect(contagem.body.data).toEqual({ nao_lidas: 1 });
  });

  it('subordinado responde → consultor vinculado e participantes são notificados', async () => {
    const { consultor, outroInterno, cliente, sub } = await prepararCenario();
    await prisma.clienteAnotacao.create({
      data: { clienteId: cliente.usuario.id, autorId: outroInterno.usuario.id, conteudo: 'oi' },
    });

    const resposta = await request(app.getHttpServer())
      .post(MINHAS)
      .set('Authorization', `Bearer ${sub.token}`)
      .field('conteudo', 'Aprovado!');

    expect(resposta.status).toBe(201);
    expect(resposta.body).toMatchObject({
      code: 201,
      status: 'success',
      message: 'Mensagem enviada com sucesso!',
      data: {
        conteudo: 'Aprovado!',
        tipo: 'nota',
        autor: { id: Number(sub.subordinado.id), nome: 'Compras', tipo: 'subordinado' },
        eh_minha: true,
        pode_editar: false,
        pode_excluir: false,
      },
    });

    const gravada = await prisma.clienteAnotacao.findUnique({
      where: { id: BigInt(resposta.body.data.id) },
    });
    expect(gravada).toMatchObject({
      clienteId: cliente.usuario.id,
      autorTipo: 'subordinado',
      autorId: null,
      autorSubordinadoId: sub.subordinado.id,
    });

    const destinatarios = (
      await prisma.notificacao.findMany({ where: { anotacaoId: gravada!.id } })
    ).map((n) => n.destinatarioUserId);
    expect(destinatarios.sort()).toEqual([consultor.usuario.id, outroInterno.usuario.id].sort());

    const internoVe = await request(app.getHttpServer())
      .get(`${PREFIXO_API}/clientes/${cliente.usuario.id}/anotacoes`)
      .set('Authorization', `Bearer ${consultor.token}`);
    expect(internoVe.body.data[0]).toMatchObject({
      autor: { tipo: 'subordinado' },
      pode_editar: false,
      pode_excluir: false,
    });
  });

  it('cliente principal responde → gravado como cliente e consultor notificado', async () => {
    const { consultor, cliente } = await prepararCenario();

    const resposta = await request(app.getHttpServer())
      .post(MINHAS)
      .set('Authorization', `Bearer ${cliente.token}`)
      .field('conteudo', 'Pode faturar.');

    expect(resposta.status).toBe(201);
    expect(resposta.body.data).toMatchObject({
      autor: { id: Number(cliente.usuario.id), tipo: 'cliente' },
      eh_minha: true,
    });
    const gravada = await prisma.clienteAnotacao.findUnique({
      where: { id: BigInt(resposta.body.data.id) },
    });
    expect(gravada).toMatchObject({ autorTipo: 'cliente', autorId: cliente.usuario.id });

    const notificacao = await prisma.notificacao.findFirst({ where: { anotacaoId: gravada!.id } });
    expect(notificacao).toMatchObject({
      destinatarioUserId: consultor.usuario.id,
      link: `/clientes/${cliente.usuario.id}`,
    });

    const contagem = await request(app.getHttpServer())
      .get(`${NOTIFICACOES}/nao-lidas/contagem`)
      .set('Authorization', `Bearer ${consultor.token}`);
    expect(contagem.status).toBe(200);
    expect(contagem.body).toMatchObject({ code: 200, status: 'success', data: { nao_lidas: 1 } });
  });

  it('400 ao responder sem texto nem anexo', async () => {
    const { cliente } = await prepararCenario();

    const resposta = await request(app.getHttpServer())
      .post(MINHAS)
      .set('Authorization', `Bearer ${cliente.token}`)
      .field('conteudo', '  ');

    expect(resposta.status).toBe(400);
    expect(await prisma.clienteAnotacao.count()).toBe(0);
    expect(await prisma.notificacao.count()).toBe(0);
  });

  it('cliente não baixa anexo de outra empresa', async () => {
    const { consultor, cliente } = await prepararCenario();
    const outra = await criarUsuarioAutenticado(app, Role.CLIENTE);
    const criada = await request(app.getHttpServer())
      .post(`${PREFIXO_API}/clientes/${outra.usuario.id}/anotacoes`)
      .set('Authorization', `Bearer ${consultor.token}`)
      .attach('anexos', Buffer.from('x'), 'segredo.txt');

    const resposta = await request(app.getHttpServer())
      .get(`${MINHAS}/${criada.body.data.id}/anexos/${criada.body.data.anexos[0].id}`)
      .set('Authorization', `Bearer ${cliente.token}`);

    expect(resposta.status).toBe(404);
  });

  describe('/notificacoes', () => {
    const rotasNotificacoes: Array<[string, 'get' | 'patch', string]> = [
      ['GET /notificacoes', 'get', NOTIFICACOES],
      ['GET /notificacoes/nao-lidas/contagem', 'get', `${NOTIFICACOES}/nao-lidas/contagem`],
      ['PATCH /notificacoes/lidas', 'patch', `${NOTIFICACOES}/lidas`],
      ['PATCH /notificacoes/:id/lida', 'patch', `${NOTIFICACOES}/1/lida`],
    ];

    it.each(rotasNotificacoes)('%s responde 401 sem token', async (_nome, metodo, url) => {
      const resposta = await request(app.getHttpServer())[metodo](url);
      expect(resposta.status).toBe(401);
    });

    it('lista, marca uma e marca todas como lidas, só na própria caixa', async () => {
      const { consultor, outroInterno } = await prepararCenario();
      const base = { tipo: 'anotacao_cliente', titulo: 't', mensagem: 'm' };
      const [primeira] = await Promise.all([
        prisma.notificacao.create({ data: { ...base, destinatarioUserId: consultor.usuario.id } }),
        prisma.notificacao.create({ data: { ...base, destinatarioUserId: consultor.usuario.id } }),
      ]);
      await prisma.notificacao.create({
        data: { ...base, destinatarioUserId: outroInterno.usuario.id },
      });

      const lista = await request(app.getHttpServer())
        .get(NOTIFICACOES)
        .set('Authorization', `Bearer ${consultor.token}`);
      expect(lista.status).toBe(200);
      expect(lista.body).toMatchObject({
        code: 200,
        status: 'success',
        nao_lidas: 2,
        pagination: { total: 2 },
      });
      expect(lista.body.data[0]).toEqual(
        expect.objectContaining({ titulo: 't', lida: false, link: null }),
      );

      const deOutro = await request(app.getHttpServer())
        .patch(`${NOTIFICACOES}/${primeira.id}/lida`)
        .set('Authorization', `Bearer ${outroInterno.token}`);
      expect(deOutro.status).toBe(404);

      const marcada = await request(app.getHttpServer())
        .patch(`${NOTIFICACOES}/${primeira.id}/lida`)
        .set('Authorization', `Bearer ${consultor.token}`);
      expect(marcada.status).toBe(200);
      expect(marcada.body.data).toMatchObject({ lida: true });
      const primeiraGravada = await prisma.notificacao.findUnique({ where: { id: primeira.id } });
      expect(primeiraGravada?.lidaEm).not.toBeNull();

      const todas = await request(app.getHttpServer())
        .patch(`${NOTIFICACOES}/lidas`)
        .set('Authorization', `Bearer ${consultor.token}`);
      expect(todas.status).toBe(200);
      expect(todas.body).toMatchObject({
        code: 200,
        status: 'success',
        message: 'Notificações marcadas como lidas.',
        data: { marcadas: 1 },
      });
      expect(
        await prisma.notificacao.count({
          where: { destinatarioUserId: consultor.usuario.id, lidaEm: null },
        }),
      ).toBe(0);
      expect(
        await prisma.notificacao.count({
          where: { destinatarioUserId: outroInterno.usuario.id, lidaEm: null },
        }),
      ).toBe(1);
    });

    it('400 com filtro inválido e com id não numérico', async () => {
      const { consultor } = await prepararCenario();

      const filtro = await request(app.getHttpServer())
        .get(`${NOTIFICACOES}?apenas_nao_lidas=talvez`)
        .set('Authorization', `Bearer ${consultor.token}`);
      const id = await request(app.getHttpServer())
        .patch(`${NOTIFICACOES}/abc/lida`)
        .set('Authorization', `Bearer ${consultor.token}`);

      expect(filtro.status).toBe(400);
      expect(id.status).toBe(400);
    });
  });
});
