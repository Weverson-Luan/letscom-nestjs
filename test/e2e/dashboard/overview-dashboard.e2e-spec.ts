import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Feature } from 'src/shared/auth/features';
import { Role } from 'src/shared/constants/roles';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { criarAppE2e, PREFIXO_API } from '../helpers/criar-app-e2e';
import { criarUsuarioAutenticado } from '../helpers/criar-usuario-autenticado';
import { liberarFeature } from '../helpers/liberar-feature';
import { limparBanco } from '../helpers/limpar-banco';

describe('Dashboard — GET /dashboard/overview (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const rota = () => `${PREFIXO_API}/dashboard/overview`;

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

  /** Cria remessas do mesmo cliente com os status informados. */
  async function criarRemessas(status: string[]) {
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

    for (const [indice, valor] of status.entries()) {
      await prisma.remessa.create({
        data: {
          clienteId: cliente.id,
          modeloTecnicoId: modelo.id,
          tecnologiaId: tecnologia.id,
          totalSolicitacoes: 10,
          numeroRemessa: BigInt(60000 + indice),
          status: valor,
        },
      });
    }
  }

  it('devolve as canceladas junto com a taxa de sucesso', async () => {
    await liberarFeature(prisma, Feature.ACESSAR_BACKOFFICE, [Role.ADMIN]);
    const { token } = await criarUsuarioAutenticado(app, Role.ADMIN);
    await criarRemessas(['concluido', 'concluido', 'concluido', 'cancelada', 'em_producao']);
    const excluida = await prisma.remessa.findFirst({ where: { status: 'cancelada' } });
    await prisma.remessa.create({
      data: {
        clienteId: excluida!.clienteId,
        modeloTecnicoId: excluida!.modeloTecnicoId,
        tecnologiaId: excluida!.tecnologiaId,
        totalSolicitacoes: 1,
        numeroRemessa: BigInt(69999),
        status: 'cancelada',
        deletedAt: new Date(),
      },
    });

    const resposta = await request(app.getHttpServer())
      .get(rota())
      .set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(200);
    expect(resposta.body.data).toMatchObject({ taxa_sucesso: 75, remessas_canceladas: 1 });
  });

  it('devolve zero canceladas quando não há remessas', async () => {
    await liberarFeature(prisma, Feature.ACESSAR_BACKOFFICE, [Role.ADMIN]);
    const { token } = await criarUsuarioAutenticado(app, Role.ADMIN);

    const resposta = await request(app.getHttpServer())
      .get(rota())
      .set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(200);
    expect(resposta.body.data).toMatchObject({ taxa_sucesso: 0, remessas_canceladas: 0 });
  });

  it('recusa sem token', async () => {
    const resposta = await request(app.getHttpServer()).get(rota());

    expect(resposta.status).toBe(401);
  });

  it('recusa sem a feature de acesso ao backoffice', async () => {
    const { token } = await criarUsuarioAutenticado(app, Role.ADMIN);

    const resposta = await request(app.getHttpServer())
      .get(rota())
      .set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(403);
  });
});
