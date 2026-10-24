import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Feature, MENSAGEM_SEM_PERMISSAO } from 'src/shared/auth/features';
import { Role } from 'src/shared/constants/roles';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { criarAppE2e, PREFIXO_API } from '../helpers/criar-app-e2e';
import { criarUsuarioAutenticado } from '../helpers/criar-usuario-autenticado';
import { liberarFeature } from '../helpers/liberar-feature';
import { limparBanco } from '../helpers/limpar-banco';

describe('Remessas em andamento do cliente — GET /remessas/cliente/:id/remessas-em-andamento (e2e)', () => {
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

  async function criarRemessa(clienteId: bigint, nomeModelo: string) {
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
      data: { clienteId, produtoId: produto.id, tecnologiaId: tecnologia.id, nomeModelo },
    });

    return prisma.remessa.create({
      data: {
        clienteId,
        modeloTecnicoId: modelo.id,
        tecnologiaId: tecnologia.id,
        totalSolicitacoes: 10,
        numeroRemessa: BigInt(52647),
        status: 'em_producao',
      },
    });
  }

  function listar(clienteId: bigint, token: string | null) {
    const chamada = request(app.getHttpServer()).get(
      `${PREFIXO_API}/remessas/cliente/${clienteId}/remessas-em-andamento`,
    );
    if (token) chamada.set('Authorization', `Bearer ${token}`);
    return chamada;
  }

  it('devolve o nome do modelo técnico em snake_case', async () => {
    await liberarFeature(prisma, Feature.VISUALIZAR_REMESSAS_ANDAMENTO, [Role.CLIENTE]);
    const { usuario: cliente, token } = await criarUsuarioAutenticado(app, Role.CLIENTE);
    await criarRemessa(cliente.id, 'Carteirinha Estudante');

    const resposta = await listar(cliente.id, token);

    expect(resposta.status).toBe(200);
    expect(resposta.body.data).toHaveLength(1);
    const modelo = resposta.body.data[0].modelo_tecnico;
    expect(modelo.nome_modelo).toBe('Carteirinha Estudante');
    expect(modelo).toHaveProperty('foto_frente_url', null);
    expect(modelo).not.toHaveProperty('nomeModelo');
  });

  it('não lista sem a feature de remessas em andamento', async () => {
    const { usuario: cliente, token } = await criarUsuarioAutenticado(app, Role.CLIENTE);
    await criarRemessa(cliente.id, 'Carteirinha Estudante');

    const resposta = await listar(cliente.id, token);

    expect(resposta.status).toBe(403);
    expect(resposta.body.message).toBe(MENSAGEM_SEM_PERMISSAO);
  });

  it('recusa sem token', async () => {
    const { usuario: cliente } = await criarUsuarioAutenticado(app, Role.CLIENTE);

    const resposta = await listar(cliente.id, null);

    expect(resposta.status).toBe(401);
  });
});
