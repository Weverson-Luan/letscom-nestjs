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

describe('Registrar status da remessa — POST /remessas/:id/status (e2e)', () => {
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

  async function criarRemessa() {
    const { usuario: cliente } = await criarUsuarioAutenticado(app, Role.CLIENTE);
    const tecnologia = await prisma.tecnologia.create({ data: { nome: 'PVC e2e' } });
    const produto = await prisma.product.create({
      data: {
        nome: 'Crachá e2e',
        valor: 10,
        valorCreditos: 1,
        estoqueMinimo: 0,
        estoqueMaximo: 100,
        estoqueAtual: 50,
      },
    });
    const modelo = await prisma.modeloTecnico.create({
      data: { clienteId: cliente.id, produtoId: produto.id, tecnologiaId: tecnologia.id },
    });

    return prisma.remessa.create({
      data: {
        clienteId: cliente.id,
        modeloTecnicoId: modelo.id,
        tecnologiaId: tecnologia.id,
        totalSolicitacoes: 10,
        numeroRemessa: BigInt(52647),
        status: 'em_producao',
      },
    });
  }

  /** Subordinado (users_cliente) com papel ativo e token de login-subordinado. */
  async function criarSubordinadoAutenticado(clienteId: bigint) {
    const subordinado = await prisma.userCliente.create({
      data: { clienteId, email: 'compras@cliente.test', nome: 'Compras', senha: 'nao-usada' },
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

  function registrar(remessaId: bigint, token: string | null, body: Record<string, unknown>) {
    const chamada = request(app.getHttpServer()).post(
      `${PREFIXO_API}/remessas/${remessaId}/status`,
    );
    if (token) chamada.set('Authorization', `Bearer ${token}`);
    return chamada.send(body);
  }

  function contarHistorico(remessaId: bigint) {
    return prisma.remessaStatus.count({ where: { remessaId } });
  }

  it('grava no histórico o usuário interno que avançou a remessa', async () => {
    await liberarFeature(prisma, Feature.FINALIZAR_TAREFA_REMESSAS, [Role.PRODUCAO]);
    const { usuario, token } = await criarUsuarioAutenticado(app, Role.PRODUCAO);
    const remessa = await criarRemessa();

    const resposta = await registrar(remessa.id, token, { status: 'conferido' });

    expect(resposta.status).toBe(201);
    expect(resposta.body).toEqual({ message: 'Status registrado com sucesso.' });

    const historico = await prisma.remessaStatus.findMany({ where: { remessaId: remessa.id } });
    expect(historico).toHaveLength(1);
    expect(historico[0]).toMatchObject({ status: 'conferido', userId: usuario.id });

    const atualizada = await prisma.remessa.findUnique({ where: { id: remessa.id } });
    expect(atualizada?.status).toBe('conferido');
  });

  it('grava o histórico sem autor quando quem avança é um subordinado', async () => {
    await liberarFeature(prisma, Feature.FINALIZAR_TAREFA_REMESSAS, [Role.SUBORDINADO]);
    const remessa = await criarRemessa();
    const { token } = await criarSubordinadoAutenticado(remessa.clienteId);

    const resposta = await registrar(remessa.id, token, { status: 'conferido' });

    expect(resposta.status).toBe(201);
    const historico = await prisma.remessaStatus.findMany({ where: { remessaId: remessa.id } });
    expect(historico).toHaveLength(1);
    expect(historico[0]).toMatchObject({ status: 'conferido', userId: null });
  });

  it('não registra o status sem a feature da ação', async () => {
    const { token } = await criarUsuarioAutenticado(app, Role.PRODUCAO);
    const remessa = await criarRemessa();

    const resposta = await registrar(remessa.id, token, { status: 'conferido' });

    expect(resposta.status).toBe(403);
    expect(resposta.body.message).toBe(MENSAGEM_SEM_PERMISSAO);
    expect(await contarHistorico(remessa.id)).toBe(0);
  });

  it('recusa sem token', async () => {
    const remessa = await criarRemessa();

    const resposta = await registrar(remessa.id, null, { status: 'conferido' });

    expect(resposta.status).toBe(401);
    expect(await contarHistorico(remessa.id)).toBe(0);
  });

  it.each([
    ['status fora do fluxo', { status: 'qualquer_coisa' }],
    ['body vazio', {}],
  ])('recusa %s', async (_, body) => {
    await liberarFeature(prisma, Feature.FINALIZAR_TAREFA_REMESSAS, [Role.PRODUCAO]);
    const { token } = await criarUsuarioAutenticado(app, Role.PRODUCAO);
    const remessa = await criarRemessa();

    const resposta = await registrar(remessa.id, token, body);

    expect(resposta.status).toBe(400);
    expect(await contarHistorico(remessa.id)).toBe(0);
  });
});
