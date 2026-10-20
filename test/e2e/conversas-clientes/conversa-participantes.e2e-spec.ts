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

const MINHAS = `${PREFIXO_API}/minha-conversa/mensagens`;
const MEUS_PARTICIPANTES = `${PREFIXO_API}/minha-conversa/participantes`;
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
    await liberarFeature(prisma, Feature.VISUALIZAR_CONVERSA_CLIENTE, PAPEIS_INTERNOS);
    await liberarFeature(prisma, Feature.ENVIAR_MENSAGENS_CONVERSA_CLIENTE, PAPEIS_INTERNOS);
    await liberarFeature(prisma, Feature.RESPONDER_CONVERSA_CLIENTE, [
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
    const mensagens = `${PREFIXO_API}/clientes/${cliente.usuario.id}/conversa/mensagens`;
    const participantes = `${PREFIXO_API}/clientes/${cliente.usuario.id}/conversa/participantes`;
    return {
      consultor,
      producao,
      recepcao,
      admin,
      cliente,
      compras,
      financeiro,
      mensagens,
      participantes,
    };
  }

  type Cenario = Awaited<ReturnType<typeof prepararCenario>>;

  /** Primeira mensagem do consultor: inicia a conversa (com o subordinado, se informado). */
  async function iniciarConversa(cenario: Cenario, subordinadoId?: bigint) {
    const envio = request(app.getHttpServer())
      .post(cenario.mensagens)
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

  async function listarMensagens(rota: string, token: string) {
    return request(app.getHttpServer()).get(rota).set('Authorization', `Bearer ${token}`);
  }

  describe('autorização', () => {
    const rotasInternas: Array<[string, 'get' | 'post' | 'delete', string]> = [
      ['GET participantes', 'get', `${PREFIXO_API}/clientes/1/conversa/participantes`],
      ['GET candidatos', 'get', `${PREFIXO_API}/clientes/1/conversa/participantes/candidatos`],
      ['POST participantes', 'post', `${PREFIXO_API}/clientes/1/conversa/participantes`],
      ['DELETE participante', 'delete', `${PREFIXO_API}/clientes/1/conversa/participantes/1`],
      [
        'POST inativar participante',
        'post',
        `${PREFIXO_API}/clientes/1/conversa/participantes/1/inativar`,
      ],
      [
        'POST reativar participante',
        'post',
        `${PREFIXO_API}/clientes/1/conversa/participantes/1/reativar`,
      ],
      ['GET meus participantes', 'get', MEUS_PARTICIPANTES],
      ['GET meus candidatos', 'get', `${MEUS_PARTICIPANTES}/candidatos`],
      ['POST meus participantes', 'post', MEUS_PARTICIPANTES],
      ['DELETE meu participante', 'delete', `${MEUS_PARTICIPANTES}/1`],
      ['POST inativar meu participante', 'post', `${MEUS_PARTICIPANTES}/1/inativar`],
      ['POST reativar meu participante', 'post', `${MEUS_PARTICIPANTES}/1/reativar`],
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
    it('403 sem a feature: listar exige visualizar; candidatos, convidar, remover, inativar e reativar exigem enviar', async () => {
      const { token } = await criarUsuarioAutenticado(app, Role.CONSULTOR);
      const base = `${PREFIXO_API}/clientes/1/conversa/participantes`;

      await liberarFeature(prisma, Feature.VISUALIZAR_CONVERSA_CLIENTE, PAPEIS_INTERNOS);
      const semRegistrar = await Promise.all([
        request(app.getHttpServer())
          .get(`${base}/candidatos`)
          .set('Authorization', `Bearer ${token}`),
        request(app.getHttpServer())
          .post(base)
          .set('Authorization', `Bearer ${token}`)
          .send({ user_id: 2 }),
        request(app.getHttpServer()).delete(`${base}/1`).set('Authorization', `Bearer ${token}`),
        request(app.getHttpServer())
          .post(`${base}/1/inativar`)
          .set('Authorization', `Bearer ${token}`),
        request(app.getHttpServer())
          .post(`${base}/1/reativar`)
          .set('Authorization', `Bearer ${token}`),
      ]);
      for (const resposta of semRegistrar) {
        expect(resposta.status).toBe(403);
        expect(resposta.body.message).toBe(MENSAGEM_SEM_PERMISSAO);
      }

      await prisma.featureFlag.deleteMany();
      await liberarFeature(prisma, Feature.ENVIAR_MENSAGENS_CONVERSA_CLIENTE, PAPEIS_INTERNOS);
      const semVisualizar = await request(app.getHttpServer())
        .get(base)
        .set('Authorization', `Bearer ${token}`);
      expect(semVisualizar.status).toBe(403);
      expect(semVisualizar.body.message).toBe(MENSAGEM_SEM_PERMISSAO);
    });

    it('403 em /minha-conversa/participantes sem a feature de responder', async () => {
      const { token } = await criarUsuarioAutenticado(app, Role.CLIENTE);
      const rotas: Array<['get' | 'post' | 'delete', string]> = [
        ['get', MEUS_PARTICIPANTES],
        ['get', `${MEUS_PARTICIPANTES}/candidatos`],
        ['post', MEUS_PARTICIPANTES],
        ['delete', `${MEUS_PARTICIPANTES}/1`],
        ['post', `${MEUS_PARTICIPANTES}/1/inativar`],
        ['post', `${MEUS_PARTICIPANTES}/1/reativar`],
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
      const { consultor, mensagens, participantes } = await prepararCenario();

      const zero = await request(app.getHttpServer())
        .post(mensagens)
        .set('Authorization', `Bearer ${consultor.token}`)
        .field('conteudo', 'Olá')
        .field('subordinado_id', '0');
      const texto = await request(app.getHttpServer())
        .post(mensagens)
        .set('Authorization', `Bearer ${consultor.token}`)
        .field('conteudo', 'Olá')
        .field('subordinado_id', 'abc');
      const busca = await request(app.getHttpServer())
        .get(`${participantes}/candidatos?search=${'a'.repeat(101)}`)
        .set('Authorization', `Bearer ${consultor.token}`);

      expect(zero.status).toBe(400);
      expect(texto.status).toBe(400);
      expect(busca.status).toBe(400);
      expect(await prisma.conversaMensagem.count()).toBe(0);
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
    const { producao, mensagens, participantes } = cenario;
    const mensagem = await iniciarConversa(cenario);

    const lista = await listarMensagens(mensagens, producao.token);
    const anexo = await request(app.getHttpServer())
      .get(`${mensagens}/${mensagem.id}/anexos/${mensagem.anexos[0].id}`)
      .set('Authorization', `Bearer ${producao.token}`);
    const escrita = await request(app.getHttpServer())
      .post(mensagens)
      .set('Authorization', `Bearer ${producao.token}`)
      .field('conteudo', 'Posso entrar?');
    const edicao = await request(app.getHttpServer())
      .put(`${mensagens}/${mensagem.id}`)
      .set('Authorization', `Bearer ${producao.token}`)
      .send({ conteudo: 'x' });
    const exclusao = await request(app.getHttpServer())
      .delete(`${mensagens}/${mensagem.id}`)
      .set('Authorization', `Bearer ${producao.token}`);

    expect(lista.status).toBe(403);
    expect(lista.body.message).toBe(MENSAGEM_SEM_ACESSO);
    expect(anexo.status).toBe(403);
    expect(storage.download).not.toHaveBeenCalled();
    expect(escrita.status).toBe(403);
    expect(edicao.status).toBe(403);
    expect(exclusao.status).toBe(403);
    expect(await prisma.conversaMensagem.count()).toBe(1);

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
    const { admin, producao, mensagens, participantes } = cenario;
    const mensagem = await iniciarConversa(cenario);

    const lista = await listarMensagens(mensagens, admin.token);
    const anexo = await request(app.getHttpServer())
      .get(`${mensagens}/${mensagem.id}/anexos/${mensagem.anexos[0].id}`)
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
    const { consultor, producao, cliente, mensagens, participantes } = cenario;
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

    const pendente = await listarMensagens(mensagens, producao.token);
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

    // como no WhatsApp: o convidado só vê o que vier depois de entrar
    const liberada = await listarMensagens(mensagens, producao.token);
    expect(liberada.status).toBe(200);
    expect(liberada.body.data).toHaveLength(0);

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
        where: { conversaMensagemId: BigInt(resposta.body.data.id) },
      })
    ).map((n) => n.destinatarioUserId);
    expect(destinatarios.sort()).toEqual([consultor.usuario.id, producao.usuario.id].sort());

    // mensagem do convidado: notifica o dono interno e o cliente, nunca o próprio autor
    const doConvidado = await request(app.getHttpServer())
      .post(mensagens)
      .set('Authorization', `Bearer ${producao.token}`)
      .field('conteudo', 'Em produção.');
    expect(doConvidado.status).toBe(201);
    const notificacoes = await prisma.notificacao.findMany({
      where: { conversaMensagemId: BigInt(doConvidado.body.data.id) },
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
          link: '/minha-conversa',
        }),
      ]),
    );
  });

  it('convidado só vê mensagens e anexos a partir de quando aceitou; dono vê tudo', async () => {
    const cenario = await prepararCenario();
    const { consultor, compras, financeiro, mensagens } = cenario;
    const antiga = await iniciarConversa(cenario, compras.subordinado.id);
    const urlAnexoAntigo = `${mensagens}/${antiga.id}/anexos/${antiga.anexos[0].id}`;

    // dono do lado do cliente (compras) convida o financeiro, que aceita depois
    const convite = await convidar(MEUS_PARTICIPANTES, compras.token, {
      subordinado_id: Number(financeiro.subordinado.id),
    });
    expect(convite.status).toBe(201);
    const aceito = await request(app.getHttpServer())
      .post(`${CONVITES}/${convite.body.data.id}/aceitar`)
      .set('Authorization', `Bearer ${financeiro.token}`);
    expect(aceito.status).toBe(200);

    const nova = await request(app.getHttpServer())
      .post(mensagens)
      .set('Authorization', `Bearer ${consultor.token}`)
      .field('conteudo', 'Mensagem depois da entrada');
    expect(nova.status).toBe(201);

    const doConvidado = await request(app.getHttpServer())
      .get(MINHAS)
      .set('Authorization', `Bearer ${financeiro.token}`);
    expect(doConvidado.status).toBe(200);
    expect(doConvidado.body.data.map((m: { id: number }) => m.id)).toEqual([nova.body.data.id]);
    expect(doConvidado.body.pagination.total).toBe(1);

    const anexoAntigo = await request(app.getHttpServer())
      .get(`${MINHAS}/${antiga.id}/anexos/${antiga.anexos[0].id}`)
      .set('Authorization', `Bearer ${financeiro.token}`);
    expect(anexoAntigo.status).toBe(404);

    const doDono = await request(app.getHttpServer())
      .get(MINHAS)
      .set('Authorization', `Bearer ${compras.token}`);
    expect(doDono.body.data).toHaveLength(2);
    expect((await listarMensagens(mensagens, consultor.token)).body.data).toHaveLength(2);
    const anexoDono = await request(app.getHttpServer())
      .get(urlAnexoAntigo)
      .set('Authorization', `Bearer ${consultor.token}`);
    expect(anexoDono.status).toBe(200);
  });

  it('recusar mantém o 403 e o dono pode convidar de novo', async () => {
    const cenario = await prepararCenario();
    const { consultor, producao, mensagens, participantes } = cenario;
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

    expect((await listarMensagens(mensagens, producao.token)).status).toBe(403);

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
    expect((await listarMensagens(mensagens, producao.token)).status).toBe(200);
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
    const convidadoInativa = await request(app.getHttpServer())
      .post(`${participantes}/${convite.body.data.id}/inativar`)
      .set('Authorization', `Bearer ${producao.token}`);
    const convidadoCandidatos = await request(app.getHttpServer())
      .get(`${participantes}/candidatos`)
      .set('Authorization', `Bearer ${producao.token}`);

    expect(convidadoConvida.status).toBe(403);
    expect(convidadoConvida.body.message).toBe(
      'Só quem iniciou a conversa pode convidar ou remover participantes.',
    );
    expect(convidadoRemove.status).toBe(403);
    expect(convidadoInativa.status).toBe(403);
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
    const principalLista = await listarMensagens(MINHAS, cliente.token);
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
        link: '/minha-conversa',
        convite: { id: convite.body.data.id, status: 'pendente' },
      }),
    ]);

    expect((await listarMensagens(MINHAS, financeiro.token)).status).toBe(403);
    const aceito = await request(app.getHttpServer())
      .post(`${CONVITES}/${convite.body.data.id}/aceitar`)
      .set('Authorization', `Bearer ${financeiro.token}`);
    expect(aceito.status).toBe(200);
    expect((await listarMensagens(MINHAS, financeiro.token)).status).toBe(200);

    // mensagem do lado do cliente para o lado do cliente: título próprio
    const resposta = await request(app.getHttpServer())
      .post(MINHAS)
      .set('Authorization', `Bearer ${compras.token}`)
      .field('conteudo', 'Financeiro, confere o boleto?');
    expect(resposta.status).toBe(201);
    const notificacoes = await prisma.notificacao.findMany({
      where: { conversaMensagemId: BigInt(resposta.body.data.id) },
    });
    expect(notificacoes).toHaveLength(2);
    expect(notificacoes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          destinatarioSubordinadoId: financeiro.subordinado.id,
          titulo: 'Nova mensagem na conversa',
          link: '/minha-conversa',
        }),
        expect.objectContaining({
          destinatarioUserId: consultor.usuario.id,
          titulo: `${cliente.usuario.nome} respondeu`,
        }),
      ]),
    );
  });

  it('remover cancela o convite pendente e apaga a notificação do convite', async () => {
    const cenario = await prepararCenario();
    const { consultor, producao, participantes } = cenario;
    await iniciarConversa(cenario);
    const convite = await convidar(participantes, consultor.token, {
      user_id: Number(producao.usuario.id),
    });
    const conviteId = convite.body.data.id as number;

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

    const deNovo = await request(app.getHttpServer())
      .delete(`${participantes}/${conviteId}`)
      .set('Authorization', `Bearer ${consultor.token}`);
    expect(deNovo.status).toBe(404);
  });

  it('inativar revoga o acesso sem apagar o participante; reativar devolve o acesso', async () => {
    const cenario = await prepararCenario();
    const { consultor, producao, mensagens, participantes } = cenario;
    await iniciarConversa(cenario);
    const convite = await convidar(participantes, consultor.token, {
      user_id: Number(producao.usuario.id),
    });
    const participanteId = convite.body.data.id as number;
    await request(app.getHttpServer())
      .post(`${CONVITES}/${participanteId}/aceitar`)
      .set('Authorization', `Bearer ${producao.token}`);
    const escrita = await request(app.getHttpServer())
      .post(mensagens)
      .set('Authorization', `Bearer ${producao.token}`)
      .field('conteudo', 'Mensagem antes de sair');
    expect(escrita.status).toBe(201);

    // quem já participa não é apagado: o DELETE orienta a inativar
    const removerAceito = await request(app.getHttpServer())
      .delete(`${participantes}/${participanteId}`)
      .set('Authorization', `Bearer ${consultor.token}`);
    expect(removerAceito.status).toBe(400);
    expect(removerAceito.body.message).toBe(
      'Quem já participa da conversa não é removido: inative o acesso.',
    );

    const inativado = await request(app.getHttpServer())
      .post(`${participantes}/${participanteId}/inativar`)
      .set('Authorization', `Bearer ${consultor.token}`);
    expect(inativado.status).toBe(200);
    expect(inativado.body).toMatchObject({
      code: 200,
      status: 'success',
      message: 'Acesso do participante inativado.',
      data: { id: participanteId, status: 'inativo', papel: 'convidado' },
    });
    expect(inativado.body.data.inativado_em).not.toBeNull();
    const linhaInativa = await prisma.conversaParticipante.findUnique({
      where: { id: BigInt(participanteId) },
    });
    expect(linhaInativa).toMatchObject({ status: 'inativo' });
    expect(linhaInativa?.inativadoEm).not.toBeNull();

    // sem acesso: não lê nem escreve, mas a mensagem dele continua no histórico
    expect((await listarMensagens(mensagens, producao.token)).status).toBe(403);
    const escreveInativo = await request(app.getHttpServer())
      .post(mensagens)
      .set('Authorization', `Bearer ${producao.token}`)
      .field('conteudo', 'Ainda estou aqui?');
    expect(escreveInativo.status).toBe(403);
    const historico = await listarMensagens(mensagens, consultor.token);
    expect(historico.body.data.map((m: { conteudo: string }) => m.conteudo)).toContain(
      'Mensagem antes de sair',
    );

    // não recebe notificação de mensagem nova enquanto inativo
    await prisma.notificacao.deleteMany();
    await request(app.getHttpServer())
      .post(mensagens)
      .set('Authorization', `Bearer ${consultor.token}`)
      .field('conteudo', 'Mensagem com produção inativa');
    expect(
      await prisma.notificacao.count({ where: { destinatarioUserId: producao.usuario.id } }),
    ).toBe(0);

    // não pode ser convidado de novo nem inativado duas vezes
    const reconvite = await convidar(participantes, consultor.token, {
      user_id: Number(producao.usuario.id),
    });
    expect(reconvite.status).toBe(400);
    expect(reconvite.body.message).toBe(
      'Esta pessoa está com o acesso inativo: reative em vez de convidar.',
    );
    const inativarDeNovo = await request(app.getHttpServer())
      .post(`${participantes}/${participanteId}/inativar`)
      .set('Authorization', `Bearer ${consultor.token}`);
    expect(inativarDeNovo.status).toBe(400);

    const reativado = await request(app.getHttpServer())
      .post(`${participantes}/${participanteId}/reativar`)
      .set('Authorization', `Bearer ${consultor.token}`);
    expect(reativado.status).toBe(200);
    expect(reativado.body).toMatchObject({
      message: 'Acesso do participante reativado.',
      data: { id: participanteId, status: 'aceito', inativado_em: null },
    });
    expect((await listarMensagens(mensagens, producao.token)).status).toBe(200);

    const reativarDeNovo = await request(app.getHttpServer())
      .post(`${participantes}/${participanteId}/reativar`)
      .set('Authorization', `Bearer ${consultor.token}`);
    expect(reativarDeNovo.status).toBe(400);
  });

  it('não reativa quem teve o cadastro desativado', async () => {
    const cenario = await prepararCenario();
    const { consultor, producao, participantes } = cenario;
    await iniciarConversa(cenario);
    const convite = await convidar(participantes, consultor.token, {
      user_id: Number(producao.usuario.id),
    });
    const participanteId = convite.body.data.id as number;
    await request(app.getHttpServer())
      .post(`${CONVITES}/${participanteId}/aceitar`)
      .set('Authorization', `Bearer ${producao.token}`);
    await request(app.getHttpServer())
      .post(`${participantes}/${participanteId}/inativar`)
      .set('Authorization', `Bearer ${consultor.token}`);
    await prisma.user.update({ where: { id: producao.usuario.id }, data: { ativo: false } });

    const reativado = await request(app.getHttpServer())
      .post(`${participantes}/${participanteId}/reativar`)
      .set('Authorization', `Bearer ${consultor.token}`);

    expect(reativado.status).toBe(400);
    expect(reativado.body.message).toBe(
      'Não é possível reativar: o cadastro desta pessoa está desativado.',
    );
    expect(
      await prisma.conversaParticipante.findUnique({ where: { id: BigInt(participanteId) } }),
    ).toMatchObject({ status: 'inativo' });
  });

  it('subordinado dono inativa e reativa outro subordinado, mas não a equipe', async () => {
    const cenario = await prepararCenario();
    const { consultor, compras, financeiro } = cenario;
    await iniciarConversa(cenario, compras.subordinado.id);
    const convite = await convidar(MEUS_PARTICIPANTES, compras.token, {
      subordinado_id: Number(financeiro.subordinado.id),
    });
    const participanteId = convite.body.data.id as number;
    await request(app.getHttpServer())
      .post(`${CONVITES}/${participanteId}/aceitar`)
      .set('Authorization', `Bearer ${financeiro.token}`);

    const inativado = await request(app.getHttpServer())
      .post(`${MEUS_PARTICIPANTES}/${participanteId}/inativar`)
      .set('Authorization', `Bearer ${compras.token}`);
    expect(inativado.status).toBe(200);
    expect((await listarMensagens(MINHAS, financeiro.token)).status).toBe(403);

    const reativado = await request(app.getHttpServer())
      .post(`${MEUS_PARTICIPANTES}/${participanteId}/reativar`)
      .set('Authorization', `Bearer ${compras.token}`);
    expect(reativado.status).toBe(200);
    expect((await listarMensagens(MINHAS, financeiro.token)).status).toBe(200);

    const donoInterno = await prisma.conversaParticipante.findFirstOrThrow({
      where: { userId: consultor.usuario.id },
    });
    const inativaEquipe = await request(app.getHttpServer())
      .post(`${MEUS_PARTICIPANTES}/${donoInterno.id}/inativar`)
      .set('Authorization', `Bearer ${compras.token}`);
    expect(inativaEquipe.status).toBe(400);
    expect(inativaEquipe.body.message).toBe('Não é possível inativar quem iniciou a conversa.');
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
    const lista = await listarMensagens(MINHAS, cliente.token);
    const estado = await request(app.getHttpServer())
      .get(MEUS_PARTICIPANTES)
      .set('Authorization', `Bearer ${cliente.token}`);

    expect(resposta.status).toBe(409);
    expect(resposta.body.message).toBe('A equipe Letscom ainda não iniciou a conversa com você.');
    expect(doSubordinado.status).toBe(409);
    expect(lista.status).toBe(200);
    expect(lista.body.data).toEqual([]);
    expect(estado.body.data).toMatchObject({ iniciada: false, pode_convidar: false });
    expect(await prisma.conversaMensagem.count()).toBe(0);
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
        .post(`${PREFIXO_API}/clientes/${outra.usuario.id}/conversa/mensagens`)
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
    const { consultor, producao, mensagens, participantes } = cenario;
    await iniciarConversa(cenario);
    expect((await listarMensagens(mensagens, producao.token)).status).toBe(403);

    await prisma.user.update({ where: { id: consultor.usuario.id }, data: { ativo: false } });

    const lista = await listarMensagens(mensagens, producao.token);
    expect(lista.status).toBe(200);
    expect(lista.body.data).toHaveLength(1);

    const escrita = await request(app.getHttpServer())
      .post(mensagens)
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
    expect((await listarMensagens(mensagens, cenario.recepcao.token)).status).toBe(403);
  });
});
