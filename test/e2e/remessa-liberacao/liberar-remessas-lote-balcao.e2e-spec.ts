/**
 * IMPORTS
 */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';

// shared / prisma (conexão com o banco)
import { PrismaService } from 'src/shared/prisma/prisma.service';

// shared / auth (features)
import { Feature } from 'src/shared/auth/features';

// shared / roles
import { Role } from 'src/shared/constants/roles';

// helpers e2e (app, banco, autenticação e features)
import { criarAppE2e, PREFIXO_API } from '../helpers/criar-app-e2e';
import { criarUsuarioAutenticado } from '../helpers/criar-usuario-autenticado';
import { liberarFeature } from '../helpers/liberar-feature';
import { limparBanco } from '../helpers/limpar-banco';

// services de remessas (cache das listagens)
import { RemessasCacheService } from 'src/modules/remessas/services/remessas-cache.service';

describe('Liberação em lote no balcão — POST /liberar-remessa/lote (e2e)', () => {
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

  async function criarRemessaConferida(clienteId: bigint) {
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
      data: {
        clienteId,
        produtoId: produto.id,
        tecnologiaId: tecnologia.id,
        nomeModelo: 'Carteirinha',
      },
    });
    const tipoEntrega = await prisma.tipoEntrega.create({ data: { tipo: 'balcao' } });
    await prisma.tipoEntregaUser.create({ data: { clienteId, tipoEntregaId: tipoEntrega.id } });

    return prisma.remessa.create({
      data: {
        clienteId,
        modeloTecnicoId: modelo.id,
        tecnologiaId: tecnologia.id,
        totalSolicitacoes: 10,
        numeroRemessa: BigInt(52647),
        status: 'conferido',
      },
    });
  }

  function listarEmAndamento(clienteId: bigint, token: string) {
    return request(app.getHttpServer())
      .get(`${PREFIXO_API}/remessas/cliente/${clienteId}/remessas-em-andamento`)
      .set('Authorization', `Bearer ${token}`);
  }

  it('a listagem em andamento já mostra o novo status logo após a liberação', async () => {
    await liberarFeature(prisma, Feature.VISUALIZAR_REMESSAS_ANDAMENTO, [Role.CLIENTE]);
    await liberarFeature(prisma, Feature.LIBERACAO_MULTIPLAS_REMESSAS_BALCAO, [Role.EXPEDICAO]);
    const { usuario: cliente, token: tokenCliente } = await criarUsuarioAutenticado(
      app,
      Role.CLIENTE,
    );
    const { token: tokenExpedicao } = await criarUsuarioAutenticado(app, Role.EXPEDICAO);
    const remessa = await criarRemessaConferida(cliente.id);

    // o banco é truncado entre execuções, mas o Redis não: descarta cache antigo deste cliente
    await app.get(RemessasCacheService).invalidarTudo(Number(cliente.id));

    // 1ª leitura grava a listagem no cache
    const antes = await listarEmAndamento(cliente.id, tokenCliente);
    expect(antes.status).toBe(200);
    expect(antes.body.data[0].status).toBe('conferido');

    const liberacao = await request(app.getHttpServer())
      .post(`${PREFIXO_API}/liberar-remessa/lote`)
      .set('Authorization', `Bearer ${tokenExpedicao}`)
      .send({ remessa_ids: [Number(remessa.id)] });
    expect(liberacao.status).toBe(201);

    const depois = await listarEmAndamento(cliente.id, tokenCliente);
    expect(depois.status).toBe(200);
    expect(depois.body.data[0].status).toBe('pedido_liberado');
  });
});
