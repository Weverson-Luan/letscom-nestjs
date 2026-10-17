import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { JwtTokenService } from 'src/modules/auth/services/jwt-token.service';
import { Feature, MENSAGEM_SEM_PERMISSAO } from 'src/shared/auth/features';
import { Role } from 'src/shared/constants/roles';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { StorageService } from 'src/shared/storage/storage.service';
import { criarAppE2e, PREFIXO_API } from '../helpers/criar-app-e2e';
import { buscarOuCriarPapel, criarUsuarioAutenticado } from '../helpers/criar-usuario-autenticado';
import { liberarFeature } from '../helpers/liberar-feature';
import { limparBanco } from '../helpers/limpar-banco';

const MINHAS = `${PREFIXO_API}/minhas-anotacoes`;
const MEUS_PARTICIPANTES = `${MINHAS}/participantes`;
const NOTIFICACOES = `${PREFIXO_API}/notificacoes`;
const CONVITES = `${PREFIXO_API}/convites-conversa`;
const PAPEIS_INTERNOS = [Role.ADMIN, Role.CONSULTOR, Role.PRODUCAO, Role.RECEPCAO];
const MENSAGEM_SEM_ACESSO =
  'Você não participa desta conversa. Peça um convite a quem iniciou a conversa.';

describe('Participantes da conversa com o cliente (e2e)', () => {
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
  async function criarSubordinadoAutenticado(clienteId: bigint, email: string, nome: string) {
    const subordinado = await prisma.userCliente.create({
      data: { clienteId, email, nome, senha: 'nao-usada' },
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
    const producao = await criarUsuarioAutenticado(app, Role.PRODUCAO);
    const recepcao = await criarUsuarioAutenticado(app, Role.RECEPCAO);
    const admin = await criarUsuarioAutenticado(app, Role.ADMIN);
    const cliente = await criarUsuarioAutenticado(app, Role.CLIENTE);
    const compras = await criarSubordinadoAutenticado(
      cliente.usuario.id,
      'compras@cliente.test',
      'Compras',
    );
    const financeiro = await criarSubordinadoAutenticado(
      cliente.usuario.id,
      'financeiro@cliente.test',
      'Financeiro',
    );
    const anotacoes = `${PREFIXO_API}/clientes/${cliente.usuario.id}/anotacoes`;
    const participantes = `${PREFIXO_API}/clientes/${cliente.usuario.id}/conversa/participantes`;
    return {
      consultor,
      producao,
      recepcao,
      admin,
      cliente,
      compras,
      financeiro,
      anotacoes,
      participantes,
    };
  }

  type Cenario = Awaited<ReturnType<typeof prepararCenario>>;

  /** Primeira mensagem do consultor: inicia a conversa (com o subordinado, se informado). */
  async function iniciarConversa(cenario: Cenario, subordinadoId?: bigint) {
    const envio = request(app.getHttpServer())
      .post(cenario.anotacoes)
      .set('Authorization', `Bearer ${cenario.consultor.token}`)
      .field('conteudo', 'Olá, tudo bem?');
    if (subordinadoId !== undefined) envio.field('subordinado_id', String(subordinadoId));
    const resposta = await envio.attach('anexos', Buffer.from('%PDF'), 'proposta.pdf');
    expect(resposta.status).toBe(201);
    return resposta.body.data as { id: number; anexos: Array<{ id: number }> };
  }

  async function convidar(rota: string, token: string, corpo: Record<string, number>) {
    return request(app.getHttpServer())
      .post(rota)
      .set('Authorization', `Bearer ${token}`)
      .send(corpo);
  }

  async function listarAnotacoes(rota: string, token: string) {
    return request(app.getHttpServer()).get(rota).set('Authorization', `Bearer ${token}`);
  }

  describe('autorização', () => {
    const rotasInternas: Array<[string, 'get' | 'post' | 'delete', string]> = [
      ['GET participantes', 'get', `${PREFIXO_API}/clientes/1/conversa/participantes`],
      ['GET candidatos', 'get', `${PREFIXO_API}/clientes/1/conversa/participantes/candidatos`],
      ['POST participantes', 'post', `${PREFIXO_API}/clientes/1/conversa/participantes`],
      ['DELETE participante', 'delete', `${PREFIXO_API}/clientes/1/conversa/participantes/1`],
      ['GET meus participantes', 'get', MEUS_PARTICIPANTES],
      ['GET meus candidatos', 'get', `${MEUS_PARTICIPANTES}/candidatos`],
      ['POST meus participantes', 'post', MEUS_PARTICIPANTES],
      ['DELETE meu participante', 'delete', `${MEUS_PARTICIPANTES}/1`],
      ['POST aceitar convite', 'post', `${CONVITES}/1/aceitar`],
      ['POST recusar convite', 'post', `${CONVITES}/1/recusar`],
    ];

    it.each(rotasInternas)('%s responde 401 sem token', async (_nome, metodo, url) => {
      const resposta = await request(app.getHttpServer())[metodo](url).send({});
      expect(resposta.status).toBe(401);
    });

    it('cliente não acessa as rotas internas de participantes e interno não acessa as do cliente', async () => {
      const { consultor, cliente, participantes } = await prepararCenario();

      const clienteInterna = await request(app.getHttpServer())
        .get(participantes)
        .set('Authorization', `Bearer ${cliente.token}`);
      const internoDoCliente = await request(app.getHttpServer())
        .get(MEUS_PARTICIPANTES)
        .set('Authorization', `Bearer ${consultor.token}`);

      expect(clienteInterna.status).toBe(403);
      expect(internoDoCliente.status).toBe(403);
    });

    it('400 ao convidar sem informar quem, ou informando os dois', async () => {
      const cenario = await prepararCenario();
      await iniciarConversa(cenario);

      const vazio = await convidar(cenario.participantes, cenario.consultor.token, {});
      const ambos = await convidar(cenario.participantes, cenario.consultor.token, {
        user_id: Number(cenario.producao.usuario.id),
        subordinado_id: Number(cenario.compras.subordinado.id),
      });

      expect(vazio.status).toBe(400);
      expect(ambos.status).toBe(400);
    });
    it('403 sem a feature: listar exige visualizar; candidatos, convidar e remover exigem registrar', async () => {
      const { token } = await criarUsuarioAutenticado(app, Role.CONSULTOR);
      const base = `${PREFIXO_API}/clientes/1/conversa/participantes`;

      await liberarFeature(prisma, Feature.VISUALIZAR_ANOTACOES_CLIENTE, PAPEIS_INTERNOS);
      const semRegistrar = await Promise.all([
        request(app.getHttpServer())
          .get(`${base}/candidatos`)
          .set('Authorization', `Bearer ${token}`),
        request(app.getHttpServer())
          .post(base)
          .set('Authorization', `Bearer ${token}`)
          .send({ user_id: 2 }),
        request(app.getHttpServer()).delete(`${base}/1`).set('Authorization', `Bearer ${token}`),
      ]);
      for (const resposta of semRegistrar) {
        expect(resposta.status).toBe(403);
        expect(resposta.body.message).toBe(MENSAGEM_SEM_PERMISSAO);
      }

      await prisma.featureFlag.deleteMany();
      await liberarFeature(prisma, Feature.REGISTRAR_ANOTACOES_CLIENTE, PAPEIS_INTERNOS);
      const semVisualizar = await request(app.getHttpServer())
        .get(base)
        .set('Authorization', `Bearer ${token}`);
      expect(semVisualizar.status).toBe(403);
      expect(semVisualizar.body.message).toBe(MENSAGEM_SEM_PERMISSAO);
    });

    it('403 em /minhas-anotacoes/participantes sem a feature de responder', async () => {
      const { token } = await criarUsuarioAutenticado(app, Role.CLIENTE);
      const rotas: Array<['get' | 'post' | 'delete', string]> = [
        ['get', MEUS_PARTICIPANTES],
        ['get', `${MEUS_PARTICIPANTES}/candidatos`],
        ['post', MEUS_PARTICIPANTES],
        ['delete', `${MEUS_PARTICIPANTES}/1`],
      ];

      for (const [metodo, url] of rotas) {
        const resposta = await request(app.getHttpServer())
          [metodo](url)
          .set('Authorization', `Bearer ${token}`)
          .send({ subordinado_id: 1 });
        expect(resposta.status).toBe(403);
        expect(resposta.body.message).toBe(MENSAGEM_SEM_PERMISSAO);
      }
    });

    it('400 ao iniciar com subordinado_id inválido e na busca de candidatos acima de 100 caracteres', async () => {
      const { consultor, anotacoes, participantes } = await prepararCenario();

      const zero = await request(app.getHttpServer())
        .post(anotacoes)
        .set('Authorization', `Bearer ${consultor.token}`)
        .field('conteudo', 'Olá')
        .field('subordinado_id', '0');
      const texto = await request(app.getHttpServer())
        .post(anotacoes)
        .set('Authorization', `Bearer ${consultor.token}`)
        .field('conteudo', 'Olá')
        .field('subordinado_id', 'abc');
      const busca = await request(app.getHttpServer())
        .get(`${participantes}/candidatos?search=${'a'.repeat(101)}`)
        .set('Authorization', `Bearer ${consultor.token}`);

      expect(zero.status).toBe(400);
      expect(texto.status).toBe(400);
      expect(busca.status).toBe(400);
      expect(await prisma.clienteAnotacao.count()).toBe(0);
      expect(await prisma.conversaParticipante.count()).toBe(0);
    });

    it('404 em participantes e candidatos quando o id não é de um cliente ativo', async () => {
      const { consultor } = await prepararCenario();
      const rota = `${PREFIXO_API}/clientes/${consultor.usuario.id}/conversa/participantes`;

      const estado = await request(app.getHttpServer())
        .get(rota)
        .set('Authorization', `Bearer ${consultor.token}`);
      const candidatos = await request(app.getHttpServer())
        .get(`${rota}/candidatos`)
        .set('Authorization', `Bearer ${consultor.token}`);

      expect(estado.status).toBe(404);
      expect(candidatos.status).toBe(404);
    });
  });

  it('primeira mensagem do operador inicia a conversa com dois donos', async () => {
    const cenario = await prepararCenario();
    const { consultor, cliente, participantes } = cenario;

    const antes = await request(app.getHttpServer())
      .get(participantes)
      .set('Authorization', `Bearer ${consultor.token}`);
    expect(antes.status).toBe(200);
    expect(antes.body.data).toEqual({
      iniciada: false,
      tem_acesso: true,
      pode_convidar: false,
      minha_participacao: null,
      participantes: [],
    });

    await iniciarConversa(cenario);

    const gravados = await prisma.conversaParticipante.findMany({ orderBy: { id: 'asc' } });
    expect(gravados).toHaveLength(2);
    expect(gravados).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          clienteId: cliente.usuario.id,
          userId: consultor.usuario.id,
          subordinadoId: null,
          papel: 'dono',
          status: 'aceito',
        }),
        expect.objectContaining({
          clienteId: cliente.usuario.id,
          userId: cliente.usuario.id,
          subordinadoId: null,
          papel: 'dono',
          status: 'aceito',
        }),
      ]),
    );

    const interno = await request(app.getHttpServer())
      .get(participantes)
      .set('Authorization', `Bearer ${consultor.token}`);
    expect(interno.status).toBe(200);
    expect(interno.body).toMatchObject({
      code: 200,
      status: 'success',
      message: 'Participantes carregados com sucesso!',
      data: {
        iniciada: true,
        tem_acesso: true,
        pode_convidar: true,
        minha_participacao: { papel: 'dono', status: 'aceito' },
      },
    });
    expect(interno.body.data.participantes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          papel: 'dono',
          lado: 'interno',
          tipo: 'interno',
          eh_eu: true,
          pessoa: expect.objectContaining({ id: Number(consultor.usuario.id) }),
        }),
        expect.objectContaining({
          papel: 'dono',
          lado: 'cliente',
          tipo: 'cliente',
          eh_eu: false,
          pessoa: expect.objectContaining({ id: Number(cliente.usuario.id) }),
        }),
      ]),
    );

    const ladoCliente = await request(app.getHttpServer())
      .get(MEUS_PARTICIPANTES)
      .set('Authorization', `Bearer ${cliente.token}`);
    expect(ladoCliente.status).toBe(200);
    expect(ladoCliente.body.data).toMatchObject({
      iniciada: true,
      tem_acesso: true,
      pode_convidar: true,
      minha_participacao: { papel: 'dono', status: 'aceito' },
    });
  });

  it('interno fora da conversa recebe 403 ao listar, baixar anexo, escrever, editar e excluir', async () => {
    const cenario = await prepararCenario();
    const { producao, anotacoes, participantes } = cenario;
    const mensagem = await iniciarConversa(cenario);

    const lista = await listarAnotacoes(anotacoes, producao.token);
    const anexo = await request(app.getHttpServer())
      .get(`${anotacoes}/${mensagem.id}/anexos/${mensagem.anexos[0].id}`)
      .set('Authorization', `Bearer ${producao.token}`);
    const escrita = await request(app.getHttpServer())
      .post(anotacoes)
      .set('Authorization', `Bearer ${producao.token}`)
      .field('conteudo', 'Posso entrar?');
    const edicao = await request(app.getHttpServer())
      .put(`${anotacoes}/${mensagem.id}`)
      .set('Authorization', `Bearer ${producao.token}`)
      .send({ conteudo: 'x' });
    const exclusao = await request(app.getHttpServer())
      .delete(`${anotacoes}/${mensagem.id}`)
      .set('Authorization', `Bearer ${producao.token}`);

    expect(lista.status).toBe(403);
    expect(lista.body.message).toBe(MENSAGEM_SEM_ACESSO);
    expect(anexo.status).toBe(403);
    expect(storage.download).not.toHaveBeenCalled();
    expect(escrita.status).toBe(403);
    expect(edicao.status).toBe(403);
    expect(exclusao.status).toBe(403);
    expect(await prisma.clienteAnotacao.count()).toBe(1);

    // o estado da conversa continua visível, mas sem a lista de participantes
    const estado = await request(app.getHttpServer())
      .get(participantes)
      .set('Authorization', `Bearer ${producao.token}`);
    expect(estado.status).toBe(200);
    expect(estado.body.data).toEqual({
      iniciada: true,
      tem_acesso: false,
      pode_convidar: false,
      minha_participacao: null,
      participantes: [],
    });
  });

  it('admin lê a conversa e baixa anexo sem convite, mas não convida', async () => {
    const cenario = await prepararCenario();
    const { admin, producao, anotacoes, participantes } = cenario;
    const mensagem = await iniciarConversa(cenario);

    const lista = await listarAnotacoes(anotacoes, admin.token);
    const anexo = await request(app.getHttpServer())
      .get(`${anotacoes}/${mensagem.id}/anexos/${mensagem.anexos[0].id}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .buffer(true);
    const convite = await convidar(participantes, admin.token, {
      user_id: Number(producao.usuario.id),
    });

    expect(lista.status).toBe(200);
    expect(lista.body.data).toHaveLength(1);
    expect(anexo.status).toBe(200);
    expect(convite.status).toBe(403);
    expect(await prisma.conversaParticipante.count()).toBe(2);
  });

  it('convite aceito libera o acesso e as notificações das mensagens seguintes', async () => {
    const cenario = await prepararCenario();
    const { consultor, producao, cliente, anotacoes, participantes } = cenario;
    await iniciarConversa(cenario);

    const convite = await convidar(participantes, consultor.token, {
      user_id: Number(producao.usuario.id),
    });
    expect(convite.status).toBe(201);
    expect(convite.body).toMatchObject({
      code: 201,
      status: 'success',
      message: 'Convite enviado com sucesso!',
      data: {
        papel: 'convidado',
        status: 'pendente',
        lado: 'interno',
        pessoa: { id: Number(producao.usuario.id) },
      },
    });
    const conviteId = convite.body.data.id as number;
    expect(
      await prisma.conversaParticipante.findUnique({ where: { id: BigInt(conviteId) } }),
    ).toMatchObject({ convidadoPorUserId: consultor.usuario.id, respondidoEm: null });

    const caixa = await request(app.getHttpServer())
      .get(NOTIFICACOES)
      .set('Authorization', `Bearer ${producao.token}`);
    expect(caixa.status).toBe(200);
    expect(caixa.body.data).toEqual([
      expect.objectContaining({
        tipo: 'convite_conversa',
        titulo: 'Convite para conversa',
        link: `/clientes/${cliente.usuario.id}`,
        convite: { id: conviteId, status: 'pendente' },
        lida: false,
      }),
    ]);

    const pendente = await listarAnotacoes(anotacoes, producao.token);
    expect(pendente.status).toBe(403);

    const duplicado = await convidar(participantes, consultor.token, {
      user_id: Number(producao.usuario.id),
    });
    expect(duplicado.status).toBe(400);
    expect(duplicado.body.message).toBe('Esta pessoa já tem um convite pendente.');

    const aceito = await request(app.getHttpServer())
      .post(`${CONVITES}/${conviteId}/aceitar`)
      .set('Authorization', `Bearer ${producao.token}`);
    expect(aceito.status).toBe(200);
    expect(aceito.body).toMatchObject({
      message: 'Convite aceito!',
      data: { id: conviteId, status: 'aceito', eh_eu: true },
    });
    const notificacaoConvite = await prisma.notificacao.findFirst({
      where: { participanteId: BigInt(conviteId) },
    });
    expect(notificacaoConvite?.lidaEm).not.toBeNull();

    const caixaDepois = await request(app.getHttpServer())
      .get(NOTIFICACOES)
      .set('Authorization', `Bearer ${producao.token}`);
    expect(caixaDepois.body.data[0].convite).toEqual({ id: conviteId, status: 'aceito' });

    const liberada = await listarAnotacoes(anotacoes, producao.token);
    expect(liberada.status).toBe(200);
    expect(liberada.body.data).toHaveLength(1);

    const jaParticipa = await convidar(participantes, consultor.token, {
      user_id: Number(producao.usuario.id),
    });
    expect(jaParticipa.status).toBe(400);
    expect(jaParticipa.body.message).toBe('Esta pessoa já participa da conversa.');

    const resposta = await request(app.getHttpServer())
      .post(MINHAS)
      .set('Authorization', `Bearer ${cliente.token}`)
      .field('conteudo', 'Pode seguir.');
    expect(resposta.status).toBe(201);

    const destinatarios = (
      await prisma.notificacao.findMany({
        where: { anotacaoId: BigInt(resposta.body.data.id) },
      })
    ).map((n) => n.destinatarioUserId);
    expect(destinatarios.sort()).toEqual([consultor.usuario.id, producao.usuario.id].sort());

    // mensagem do convidado: notifica o dono interno e o cliente, nunca o próprio autor
    const doConvidado = await request(app.getHttpServer())
      .post(anotacoes)
      .set('Authorization', `Bearer ${producao.token}`)
      .field('conteudo', 'Em produção.');
    expect(doConvidado.status).toBe(201);
    const notificacoes = await prisma.notificacao.findMany({
      where: { anotacaoId: BigInt(doConvidado.body.data.id) },
    });
    expect(notificacoes).toHaveLength(2);
    expect(notificacoes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          destinatarioUserId: consultor.usuario.id,
          titulo: `Nova mensagem na conversa com ${cliente.usuario.nome}`,
        }),
        expect.objectContaining({
          destinatarioUserId: cliente.usuario.id,
          titulo: 'Nova mensagem da equipe Letscom',
          link: '/minhas-anotacoes',
        }),
      ]),
    );
  });

  it('recusar mantém o 403 e o dono pode convidar de novo', async () => {
    const cenario = await prepararCenario();
    const { consultor, producao, anotacoes, participantes } = cenario;
    await iniciarConversa(cenario);

    const convite = await convidar(participantes, consultor.token, {
      user_id: Number(producao.usuario.id),
    });
    const conviteId = convite.body.data.id as number;

    const recusado = await request(app.getHttpServer())
      .post(`${CONVITES}/${conviteId}/recusar`)
      .set('Authorization', `Bearer ${producao.token}`);
    expect(recusado.status).toBe(200);
    expect(recusado.body).toMatchObject({
      message: 'Convite recusado.',
      data: { status: 'recusado' },
    });
    const notificacaoConvite = await prisma.notificacao.findFirst({
      where: { participanteId: BigInt(conviteId) },
    });
    expect(notificacaoConvite?.lidaEm).not.toBeNull();

    expect((await listarAnotacoes(anotacoes, producao.token)).status).toBe(403);

    const aceitarDepois = await request(app.getHttpServer())
      .post(`${CONVITES}/${conviteId}/aceitar`)
      .set('Authorization', `Bearer ${producao.token}`);
    expect(aceitarDepois.status).toBe(400);
    expect(aceitarDepois.body.message).toBe('Este convite já foi respondido.');

    const novoConvite = await convidar(participantes, consultor.token, {
      user_id: Number(producao.usuario.id),
    });
    expect(novoConvite.status).toBe(201);
    expect(novoConvite.body.data).toMatchObject({ id: conviteId, status: 'pendente' });
    expect(
      await prisma.notificacao.count({
        where: { participanteId: BigInt(conviteId), lidaEm: null },
      }),
    ).toBe(1);

    const aceito = await request(app.getHttpServer())
      .post(`${CONVITES}/${conviteId}/aceitar`)
      .set('Authorization', `Bearer ${producao.token}`);
    expect(aceito.status).toBe(200);
    expect((await listarAnotacoes(anotacoes, producao.token)).status).toBe(200);
  });

  it('quem não é dono não convida nem remove (403), mesmo participando', async () => {
    const cenario = await prepararCenario();
    const { consultor, producao, recepcao, participantes } = cenario;
    await iniciarConversa(cenario);

    const foraDaConversa = await convidar(participantes, recepcao.token, {
      user_id: Number(producao.usuario.id),
    });
    expect(foraDaConversa.status).toBe(403);

    const convite = await convidar(participantes, consultor.token, {
      user_id: Number(producao.usuario.id),
    });
    await request(app.getHttpServer())
      .post(`${CONVITES}/${convite.body.data.id}/aceitar`)
      .set('Authorization', `Bearer ${producao.token}`);

    const convidadoConvida = await convidar(participantes, producao.token, {
      user_id: Number(recepcao.usuario.id),
    });
    const convidadoRemove = await request(app.getHttpServer())
      .delete(`${participantes}/${convite.body.data.id}`)
      .set('Authorization', `Bearer ${producao.token}`);
    const convidadoCandidatos = await request(app.getHttpServer())
      .get(`${participantes}/candidatos`)
      .set('Authorization', `Bearer ${producao.token}`);

    expect(convidadoConvida.status).toBe(403);
    expect(convidadoConvida.body.message).toBe(
      'Só quem iniciou a conversa pode convidar ou remover participantes.',
    );
    expect(convidadoRemove.status).toBe(403);
    expect(convidadoCandidatos.status).toBe(403);
    expect(await prisma.conversaParticipante.count()).toBe(3);
  });

  it('subordinado dono convida outro subordinado da empresa, mas não convida interno', async () => {
    const cenario = await prepararCenario();
    const { consultor, producao, cliente, compras, financeiro } = cenario;
    await iniciarConversa(cenario, compras.subordinado.id);

    const donos = await prisma.conversaParticipante.findMany({ where: { papel: 'dono' } });
    expect(donos).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userId: consultor.usuario.id }),
        expect.objectContaining({ subordinadoId: compras.subordinado.id, userId: null }),
      ]),
    );
    expect(donos).toHaveLength(2);

    const estado = await request(app.getHttpServer())
      .get(MEUS_PARTICIPANTES)
      .set('Authorization', `Bearer ${compras.token}`);
    expect(estado.body.data).toMatchObject({ pode_convidar: true, tem_acesso: true });

    // o cliente principal não é dono: sem acesso e sem poder convidar
    const principalLista = await listarAnotacoes(MINHAS, cliente.token);
    const principalEscreve = await request(app.getHttpServer())
      .post(MINHAS)
      .set('Authorization', `Bearer ${cliente.token}`)
      .field('conteudo', 'Oi');
    const principalConvida = await convidar(MEUS_PARTICIPANTES, cliente.token, {
      subordinado_id: Number(financeiro.subordinado.id),
    });
    expect(principalLista.status).toBe(403);
    expect(principalEscreve.status).toBe(403);
    expect(principalConvida.status).toBe(403);

    const interno = await convidar(MEUS_PARTICIPANTES, compras.token, {
      user_id: Number(producao.usuario.id),
    });
    expect(interno.status).toBe(403);
    expect(interno.body.message).toBe('Você só pode convidar pessoas da sua empresa.');

    const convite = await convidar(MEUS_PARTICIPANTES, compras.token, {
      subordinado_id: Number(financeiro.subordinado.id),
    });
    expect(convite.status).toBe(201);
    expect(convite.body.data).toMatchObject({
      papel: 'convidado',
      status: 'pendente',
      lado: 'cliente',
      tipo: 'subordinado',
    });
    expect(
      await prisma.conversaParticipante.findUnique({ where: { id: BigInt(convite.body.data.id) } }),
    ).toMatchObject({
      convidadoPorSubordinadoId: compras.subordinado.id,
      convidadoPorUserId: null,
    });

    const caixa = await request(app.getHttpServer())
      .get(NOTIFICACOES)
      .set('Authorization', `Bearer ${financeiro.token}`);
    expect(caixa.body.data).toEqual([
      expect.objectContaining({
        tipo: 'convite_conversa',
        link: '/minhas-anotacoes',
        convite: { id: convite.body.data.id, status: 'pendente' },
      }),
    ]);

    expect((await listarAnotacoes(MINHAS, financeiro.token)).status).toBe(403);
    const aceito = await request(app.getHttpServer())
      .post(`${CONVITES}/${convite.body.data.id}/aceitar`)
      .set('Authorization', `Bearer ${financeiro.token}`);
    expect(aceito.status).toBe(200);
    expect((await listarAnotacoes(MINHAS, financeiro.token)).status).toBe(200);

    // mensagem do lado do cliente para o lado do cliente: título próprio
    const resposta = await request(app.getHttpServer())
      .post(MINHAS)
      .set('Authorization', `Bearer ${compras.token}`)
      .field('conteudo', 'Financeiro, confere o boleto?');
    expect(resposta.status).toBe(201);
    const notificacoes = await prisma.notificacao.findMany({
      where: { anotacaoId: BigInt(resposta.body.data.id) },
    });
    expect(notificacoes).toHaveLength(2);
    expect(notificacoes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          destinatarioSubordinadoId: financeiro.subordinado.id,
          titulo: 'Nova mensagem na conversa',
          link: '/minhas-anotacoes',
        }),
        expect.objectContaining({
          destinatarioUserId: consultor.usuario.id,
          titulo: `${cliente.usuario.nome} respondeu`,
        }),
      ]),
    );
  });

  it('remover o convidado revoga o acesso e apaga a notificação do convite', async () => {
    const cenario = await prepararCenario();
    const { consultor, producao, anotacoes, participantes } = cenario;
    await iniciarConversa(cenario);
    const convite = await convidar(participantes, consultor.token, {
      user_id: Number(producao.usuario.id),
    });
    const conviteId = convite.body.data.id as number;
    await request(app.getHttpServer())
      .post(`${CONVITES}/${conviteId}/aceitar`)
      .set('Authorization', `Bearer ${producao.token}`);
    expect((await listarAnotacoes(anotacoes, producao.token)).status).toBe(200);

    const removido = await request(app.getHttpServer())
      .delete(`${participantes}/${conviteId}`)
      .set('Authorization', `Bearer ${consultor.token}`);

    expect(removido.status).toBe(200);
    expect(removido.body).toMatchObject({
      code: 200,
      status: 'success',
      message: 'Participante removido com sucesso!',
      data: null,
    });
    expect(
      await prisma.conversaParticipante.findUnique({ where: { id: BigInt(conviteId) } }),
    ).toBeNull();
    expect(await prisma.notificacao.count({ where: { participanteId: BigInt(conviteId) } })).toBe(
      0,
    );
    expect((await listarAnotacoes(anotacoes, producao.token)).status).toBe(403);

    const deNovo = await request(app.getHttpServer())
      .delete(`${participantes}/${conviteId}`)
      .set('Authorization', `Bearer ${consultor.token}`);
    expect(deNovo.status).toBe(404);
  });

  it('não é possível remover um dono', async () => {
    const cenario = await prepararCenario();
    const { consultor, cliente, participantes } = cenario;
    await iniciarConversa(cenario);
    const donoCliente = await prisma.conversaParticipante.findFirstOrThrow({
      where: { userId: cliente.usuario.id },
    });
    const donoInterno = await prisma.conversaParticipante.findFirstOrThrow({
      where: { userId: consultor.usuario.id },
    });

    const peloOperador = await request(app.getHttpServer())
      .delete(`${participantes}/${donoCliente.id}`)
      .set('Authorization', `Bearer ${consultor.token}`);
    const peloCliente = await request(app.getHttpServer())
      .delete(`${MEUS_PARTICIPANTES}/${donoInterno.id}`)
      .set('Authorization', `Bearer ${cliente.token}`);

    expect(peloOperador.status).toBe(400);
    expect(peloOperador.body.message).toBe('Não é possível remover quem iniciou a conversa.');
    expect(peloCliente.status).toBe(400);
    expect(await prisma.conversaParticipante.count()).toBe(2);
  });

  it('cliente não escreve antes de a equipe iniciar (409) e vê a conversa vazia', async () => {
    const { cliente, compras } = await prepararCenario();

    const resposta = await request(app.getHttpServer())
      .post(MINHAS)
      .set('Authorization', `Bearer ${cliente.token}`)
      .field('conteudo', 'Olá?');
    const doSubordinado = await request(app.getHttpServer())
      .post(MINHAS)
      .set('Authorization', `Bearer ${compras.token}`)
      .field('conteudo', 'Olá?');
    const lista = await listarAnotacoes(MINHAS, cliente.token);
    const estado = await request(app.getHttpServer())
      .get(MEUS_PARTICIPANTES)
      .set('Authorization', `Bearer ${cliente.token}`);

    expect(resposta.status).toBe(409);
    expect(resposta.body.message).toBe('A equipe Letscom ainda não iniciou a conversa com você.');
    expect(doSubordinado.status).toBe(409);
    expect(lista.status).toBe(200);
    expect(lista.body.data).toEqual([]);
    expect(estado.body.data).toMatchObject({ iniciada: false, pode_convidar: false });
    expect(await prisma.clienteAnotacao.count()).toBe(0);
    expect(await prisma.conversaParticipante.count()).toBe(0);
    expect(await prisma.notificacao.count()).toBe(0);
  });

  it('antes de iniciar, o operador vê só o lado do cliente como candidatos para escolher com quem começar', async () => {
    const { producao, cliente, compras, financeiro, participantes } = await prepararCenario();

    const resposta = await request(app.getHttpServer())
      .get(`${participantes}/candidatos`)
      .set('Authorization', `Bearer ${producao.token}`);
    const doCliente = await request(app.getHttpServer())
      .get(`${MEUS_PARTICIPANTES}/candidatos`)
      .set('Authorization', `Bearer ${cliente.token}`);

    expect(resposta.status).toBe(200);
    const chaves = resposta.body.data.map(
      (c: { tipo: string; user_id: number | null; subordinado_id: number | null }) =>
        `${c.tipo}:${c.user_id ?? c.subordinado_id}`,
    );
    expect(chaves.sort()).toEqual(
      [
        `cliente:${cliente.usuario.id}`,
        `subordinado:${compras.subordinado.id}`,
        `subordinado:${financeiro.subordinado.id}`,
      ].sort(),
    );
    // o lado do cliente não inicia a conversa: sem dono, sem candidatos
    expect(doCliente.status).toBe(403);
    expect(await prisma.conversaParticipante.count()).toBe(0);
  });

  it('candidatos excluem quem já participa ou tem convite pendente', async () => {
    const cenario = await prepararCenario();
    const { consultor, producao, recepcao, admin, cliente, compras, financeiro, participantes } =
      cenario;
    await iniciarConversa(cenario);
    await convidar(participantes, consultor.token, {
      subordinado_id: Number(compras.subordinado.id),
    });

    const doOperador = await request(app.getHttpServer())
      .get(`${participantes}/candidatos`)
      .set('Authorization', `Bearer ${consultor.token}`);
    expect(doOperador.status).toBe(200);
    expect(doOperador.body.message).toBe('Candidatos carregados com sucesso!');
    const chaves = doOperador.body.data.map(
      (c: { tipo: string; user_id: number | null; subordinado_id: number | null }) =>
        `${c.tipo}:${c.user_id ?? c.subordinado_id}`,
    );
    expect(chaves.sort()).toEqual(
      [
        `subordinado:${financeiro.subordinado.id}`,
        `interno:${producao.usuario.id}`,
        `interno:${recepcao.usuario.id}`,
        `interno:${admin.usuario.id}`,
      ].sort(),
    );
    expect(chaves).not.toContain(`interno:${consultor.usuario.id}`);
    expect(chaves).not.toContain(`cliente:${cliente.usuario.id}`);
    expect(chaves).not.toContain(`subordinado:${compras.subordinado.id}`);

    const filtrado = await request(app.getHttpServer())
      .get(`${participantes}/candidatos?search=${encodeURIComponent('financeiro@')}`)
      .set('Authorization', `Bearer ${consultor.token}`);
    expect(filtrado.body.data).toEqual([
      expect.objectContaining({
        tipo: 'subordinado',
        subordinado_id: Number(financeiro.subordinado.id),
        user_id: null,
        email: 'financeiro@cliente.test',
      }),
    ]);

    // dono do lado do cliente só vê a própria empresa
    const doCliente = await request(app.getHttpServer())
      .get(`${MEUS_PARTICIPANTES}/candidatos`)
      .set('Authorization', `Bearer ${cliente.token}`);
    expect(doCliente.status).toBe(200);
    expect(doCliente.body.data).toEqual([
      expect.objectContaining({
        tipo: 'subordinado',
        subordinado_id: Number(financeiro.subordinado.id),
      }),
    ]);
  });

  it('aceitar ou recusar o convite de outra pessoa responde 404', async () => {
    const cenario = await prepararCenario();
    const { consultor, producao, recepcao, compras, participantes } = cenario;
    await iniciarConversa(cenario);
    const convite = await convidar(participantes, consultor.token, {
      user_id: Number(producao.usuario.id),
    });
    const conviteId = convite.body.data.id as number;

    const aceitarOutro = await request(app.getHttpServer())
      .post(`${CONVITES}/${conviteId}/aceitar`)
      .set('Authorization', `Bearer ${recepcao.token}`);
    const recusarOutro = await request(app.getHttpServer())
      .post(`${CONVITES}/${conviteId}/recusar`)
      .set('Authorization', `Bearer ${compras.token}`);
    const inexistente = await request(app.getHttpServer())
      .post(`${CONVITES}/999999/aceitar`)
      .set('Authorization', `Bearer ${producao.token}`);

    expect(aceitarOutro.status).toBe(404);
    expect(aceitarOutro.body.message).toBe('Convite não encontrado.');
    expect(recusarOutro.status).toBe(404);
    expect(inexistente.status).toBe(404);
    expect(
      await prisma.conversaParticipante.findUnique({ where: { id: BigInt(conviteId) } }),
    ).toMatchObject({ status: 'pendente' });
  });

  describe('isolamento entre empresas', () => {
    /** Segunda empresa com conversa iniciada pelo mesmo consultor e um subordinado convidado. */
    async function prepararOutraEmpresa(cenario: Cenario) {
      const outra = await criarUsuarioAutenticado(app, Role.CLIENTE);
      const subOutra = await criarSubordinadoAutenticado(
        outra.usuario.id,
        'compras@outra.test',
        'Compras Outra',
      );
      const participantesOutra = `${PREFIXO_API}/clientes/${outra.usuario.id}/conversa/participantes`;
      const iniciada = await request(app.getHttpServer())
        .post(`${PREFIXO_API}/clientes/${outra.usuario.id}/anotacoes`)
        .set('Authorization', `Bearer ${cenario.consultor.token}`)
        .field('conteudo', 'Olá, outra empresa');
      expect(iniciada.status).toBe(201);
      const convite = await convidar(participantesOutra, cenario.consultor.token, {
        subordinado_id: Number(subOutra.subordinado.id),
      });
      expect(convite.status).toBe(201);
      return { outra, subOutra, conviteOutraId: convite.body.data.id as number };
    }

    it('dono da empresa A não remove participante da empresa B pela rota de A (404)', async () => {
      const cenario = await prepararCenario();
      await iniciarConversa(cenario);
      const { conviteOutraId } = await prepararOutraEmpresa(cenario);

      const resposta = await request(app.getHttpServer())
        .delete(`${cenario.participantes}/${conviteOutraId}`)
        .set('Authorization', `Bearer ${cenario.consultor.token}`);

      expect(resposta.status).toBe(404);
      expect(
        await prisma.conversaParticipante.findUnique({ where: { id: BigInt(conviteOutraId) } }),
      ).not.toBeNull();
    });

    it('subordinado dono não remove participante de outra empresa (404)', async () => {
      const cenario = await prepararCenario();
      await iniciarConversa(cenario, cenario.compras.subordinado.id);
      const { conviteOutraId } = await prepararOutraEmpresa(cenario);

      const resposta = await request(app.getHttpServer())
        .delete(`${MEUS_PARTICIPANTES}/${conviteOutraId}`)
        .set('Authorization', `Bearer ${cenario.compras.token}`);

      expect(resposta.status).toBe(404);
      expect(
        await prisma.conversaParticipante.findUnique({ where: { id: BigInt(conviteOutraId) } }),
      ).not.toBeNull();
    });

    it('400 ao convidar subordinado de outra empresa', async () => {
      const cenario = await prepararCenario();
      await iniciarConversa(cenario);
      const { subOutra } = await prepararOutraEmpresa(cenario);

      const peloOperador = await convidar(cenario.participantes, cenario.consultor.token, {
        subordinado_id: Number(subOutra.subordinado.id),
      });
      const peloCliente = await convidar(MEUS_PARTICIPANTES, cenario.cliente.token, {
        subordinado_id: Number(subOutra.subordinado.id),
      });

      expect(peloOperador.status).toBe(400);
      expect(peloOperador.body.message).toBe('Pessoa não encontrada para convite.');
      expect(peloCliente.status).toBe(400);
      expect(
        await prisma.conversaParticipante.count({
          where: { clienteId: cenario.cliente.usuario.id },
        }),
      ).toBe(2);
    });
  });

  it('operador dono desativado não trava a conversa: outro interno entra e, ao escrever, vira dono', async () => {
    const cenario = await prepararCenario();
    const { consultor, producao, anotacoes, participantes } = cenario;
    await iniciarConversa(cenario);
    expect((await listarAnotacoes(anotacoes, producao.token)).status).toBe(403);

    await prisma.user.update({ where: { id: consultor.usuario.id }, data: { ativo: false } });

    const lista = await listarAnotacoes(anotacoes, producao.token);
    expect(lista.status).toBe(200);
    expect(lista.body.data).toHaveLength(1);

    const escrita = await request(app.getHttpServer())
      .post(anotacoes)
      .set('Authorization', `Bearer ${producao.token}`)
      .field('conteudo', 'Assumo daqui.');
    expect(escrita.status).toBe(201);

    expect(
      await prisma.conversaParticipante.findFirst({ where: { userId: producao.usuario.id } }),
    ).toMatchObject({ papel: 'dono', status: 'aceito' });
    const estado = await request(app.getHttpServer())
      .get(participantes)
      .set('Authorization', `Bearer ${producao.token}`);
    expect(estado.body.data).toMatchObject({
      tem_acesso: true,
      pode_convidar: true,
      minha_participacao: { papel: 'dono', status: 'aceito' },
    });

    // com um dono interno ativo de novo, a conversa volta a ser fechada para os demais
    expect((await listarAnotacoes(anotacoes, cenario.recepcao.token)).status).toBe(403);
  });
});
