import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Feature, MENSAGEM_SEM_PERMISSAO } from 'src/shared/auth/features';
import {
  DirecaoMovimentoCreditoCliente,
  TipoOperacaoCreditoCliente,
} from 'src/shared/constants/credito';
import { Role } from 'src/shared/constants/roles';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { criarAppE2e, PREFIXO_API } from '../helpers/criar-app-e2e';
import { criarUsuarioAutenticado } from '../helpers/criar-usuario-autenticado';
import { liberarFeature } from '../helpers/liberar-feature';
import { limparBanco } from '../helpers/limpar-banco';

const ROTA = `${PREFIXO_API}/vendas_creditos/minha-cobranca`;

describe('GET /vendas_creditos/minha-cobranca (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let numeroRemessa = 1000n;

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

  /** Cria uma remessa do cliente (produção finalizada por padrão) e o consumo de créditos dela no extrato. */
  async function criarConsumo(
    clienteId: bigint,
    quantidade: number,
    dataFimProducao: Date | null = new Date('2026-10-01T12:00:00.000Z'),
  ) {
    const tecnologia = await prisma.tecnologia.upsert({
      where: { nome: 'PVC e2e' },
      update: {},
      create: { nome: 'PVC e2e' },
    });
    const produto = await prisma.product.create({
      data: {
        nome: `Cartão e2e ${numeroRemessa}`,
        valor: 10,
        valorCreditos: 12.5,
        estoqueMinimo: 0,
        estoqueMaximo: 100,
        estoqueAtual: 50,
      },
    });
    const modelo = await prisma.modeloTecnico.create({
      data: { clienteId, produtoId: produto.id, tecnologiaId: tecnologia.id },
    });
    numeroRemessa += 1n;
    const remessa = await prisma.remessa.create({
      data: {
        clienteId,
        modeloTecnicoId: modelo.id,
        tecnologiaId: tecnologia.id,
        numeroRemessa,
        situacao: dataFimProducao ? 'pedido_liberado' : 'em_producao',
        status: dataFimProducao ? 'pedido_liberado' : 'em_producao',
        dataFimProducao,
      },
    });
    await prisma.extratoMovimentacaoCreditoCliente.create({
      data: {
        clienteId,
        produtoId: produto.id,
        remessaId: remessa.id,
        tipoOperacao: TipoOperacaoCreditoCliente.CONSUMO_REMESSA,
        direcaoMovimento: DirecaoMovimentoCreditoCliente.SAIDA,
        quantidadeCreditos: quantidade,
        saldoCreditosProdutoAposMovimento: 0n,
      },
    });
    return { produto, remessa };
  }

  it('responde 401 sem token', async () => {
    const resposta = await request(app.getHttpServer()).get(ROTA);

    expect(resposta.status).toBe(401);
  });

  it('responde 403 quando o papel não é cliente nem subordinado', async () => {
    await liberarFeature(prisma, Feature.VISUALIZAR_COBRANCA_CREDITO, [Role.ADMIN]);
    const { token } = await criarUsuarioAutenticado(app, Role.ADMIN);

    const resposta = await request(app.getHttpServer())
      .get(ROTA)
      .set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(403);
  });

  it('responde 403 quando a feature visualizar_cobranca_credito não está liberada', async () => {
    const { token } = await criarUsuarioAutenticado(app, Role.CLIENTE);

    const resposta = await request(app.getHttpServer())
      .get(ROTA)
      .set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(403);
    expect(resposta.body.message).toBe(MENSAGEM_SEM_PERMISSAO);
  });

  it('responde 400 quando a paginação é inválida', async () => {
    await liberarFeature(prisma, Feature.VISUALIZAR_COBRANCA_CREDITO, [Role.CLIENTE]);
    const { token } = await criarUsuarioAutenticado(app, Role.CLIENTE);

    const resposta = await request(app.getHttpServer())
      .get(ROTA)
      .query({ per_page: 500 })
      .set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(400);
  });

  it('lista só a cobrança do cliente logado, sem valores em R$', async () => {
    await liberarFeature(prisma, Feature.VISUALIZAR_COBRANCA_CREDITO, [Role.CLIENTE]);
    const { usuario, token } = await criarUsuarioAutenticado(app, Role.CLIENTE);
    const { usuario: outroCliente } = await criarUsuarioAutenticado(app, Role.CLIENTE);
    const { produto, remessa } = await criarConsumo(usuario.id, 3);
    await criarConsumo(outroCliente.id, 8);

    const resposta = await request(app.getHttpServer())
      .get(ROTA)
      .set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(200);
    expect(resposta.body.message).toBe('Cobrança de créditos carregada com sucesso.');
    expect(resposta.body.data).toEqual([
      expect.objectContaining({
        produto_id: Number(produto.id),
        produto: { id: Number(produto.id), nome: produto.nome },
        quantidade_creditos: 3,
        remessa_id: Number(remessa.id),
        remessa: expect.objectContaining({ numero_remessa: Number(remessa.numeroRemessa) }),
      }),
    ]);
    expect(resposta.body.totais).toEqual({
      total_remessas_faturaveis: 1,
      total_creditos_consumidos: 3,
    });
    expect(resposta.body.totais_por_produto).toEqual([
      { produto_id: Number(produto.id), produto_nome: produto.nome, total_creditos_consumidos: 3 },
    ]);
    expect(JSON.stringify(resposta.body)).not.toMatch(/valor/);
  });

  it('cobra só remessas com produção finalizada (data_fim_producao preenchida)', async () => {
    await liberarFeature(prisma, Feature.VISUALIZAR_COBRANCA_CREDITO, [Role.CLIENTE]);
    const { usuario, token } = await criarUsuarioAutenticado(app, Role.CLIENTE);
    const faturada = await criarConsumo(usuario.id, 2);
    await criarConsumo(usuario.id, 5, null);

    const resposta = await request(app.getHttpServer())
      .get(ROTA)
      .set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(200);
    expect(resposta.body.data).toHaveLength(1);
    expect(resposta.body.data[0].remessa_id).toBe(Number(faturada.remessa.id));
    expect(resposta.body.totais).toEqual({
      total_remessas_faturaveis: 1,
      total_creditos_consumidos: 2,
    });
  });
});
