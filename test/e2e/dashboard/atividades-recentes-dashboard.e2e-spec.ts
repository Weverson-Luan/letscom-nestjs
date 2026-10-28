import { INestApplication } from '@nestjs/common';
import { User } from '@prisma/client';
import request from 'supertest';
import { Feature } from 'src/shared/auth/features';
import { Role } from 'src/shared/constants/roles';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { criarAppE2e, PREFIXO_API } from '../helpers/criar-app-e2e';
import { criarUsuarioAutenticado } from '../helpers/criar-usuario-autenticado';
import { liberarFeature } from '../helpers/liberar-feature';
import { limparBanco } from '../helpers/limpar-banco';

describe('Dashboard — GET /dashboard/atividades-recentes (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const rota = () => `${PREFIXO_API}/dashboard/atividades-recentes`;
  const data = (dia: number) => new Date(`2026-01-0${dia}T12:00:00.000Z`);

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

  async function autenticarAdmin(): Promise<string> {
    await liberarFeature(prisma, Feature.ACESSAR_DASHBOARD, [Role.ADMIN]);
    const { token } = await criarUsuarioAutenticado(app, Role.ADMIN);
    return token;
  }

  /**
   * Semeia as 4 fontes com datas controladas. Ordem esperada (desc):
   * 1. remessa #70002 criada (dia 7)
   * 2. lote de 3 fotos da #70001 (MAX = dia 6)
   * 3. #70001 → conferido sem autor (dia 4)
   * 4. #70001 → em_producao com autor (dia 3)
   * 5. remessa #70001 criada (dia 2)
   * 6. cliente cadastrado (dia 1)
   * Fora da lista: remessa excluída #70003, usuários sem papel cliente (admin, autor).
   */
  async function semearAtividades(): Promise<{ cliente: User; autor: User }> {
    const { usuario: clienteCriado } = await criarUsuarioAutenticado(app, Role.CLIENTE);
    const cliente = await prisma.user.update({
      where: { id: clienteCriado.id },
      data: { createdAt: data(1) },
    });
    const { usuario: autor } = await criarUsuarioAutenticado(app, Role.PRODUCAO);

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
    const criarRemessa = (numero: number, createdAt: Date, deletedAt: Date | null = null) =>
      prisma.remessa.create({
        data: {
          clienteId: cliente.id,
          modeloTecnicoId: modelo.id,
          tecnologiaId: tecnologia.id,
          totalSolicitacoes: 3,
          numeroRemessa: BigInt(numero),
          createdAt,
          deletedAt,
        },
      });

    const remessa = await criarRemessa(70001, data(2));
    await criarRemessa(70002, data(7));
    await criarRemessa(70003, data(8), data(8));

    await prisma.remessaStatus.create({
      data: { remessaId: remessa.id, status: 'em_producao', dataStatus: data(3), userId: autor.id },
    });
    await prisma.remessaStatus.create({
      data: { remessaId: remessa.id, status: 'conferido', dataStatus: data(4) },
    });

    for (const createdAt of [data(5), data(5), data(6)]) {
      await prisma.remessaFoto.create({
        data: {
          remessaId: remessa.id,
          clienteId: cliente.id,
          filePath: 'fotos/e2e.jpg',
          createdAt,
        },
      });
    }

    return { cliente, autor };
  }

  it('lista as atividades das 4 fontes em ordem decrescente com as descrições', async () => {
    const token = await autenticarAdmin();
    const { cliente, autor } = await semearAtividades();

    const resposta = await request(app.getHttpServer())
      .get(rota())
      .set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(200);
    expect(resposta.body).toMatchObject({
      code: 200,
      status: 'success',
      message: 'Atividades recentes carregadas com sucesso!',
      pagination: { current_page: 1, last_page: 1, per_page: 10, total: 6 },
    });
    expect(resposta.body.data).toEqual([
      {
        tipo: 'remessa_criada',
        descricao: `Nova remessa #70002 criada por ${cliente.nome}.`,
        created_at: data(7).toISOString(),
      },
      {
        tipo: 'fotos_enviadas',
        descricao: 'Lote com 3 fotos enviado para remessa #70001.',
        created_at: data(6).toISOString(),
      },
      {
        tipo: 'status_alterado',
        descricao: 'Remessa #70001 avançou para conferido.',
        created_at: data(4).toISOString(),
      },
      {
        tipo: 'status_alterado',
        descricao: `Remessa #70001 avançou para em_producao por ${autor.nome}.`,
        created_at: data(3).toISOString(),
      },
      {
        tipo: 'remessa_criada',
        descricao: `Nova remessa #70001 criada por ${cliente.nome}.`,
        created_at: data(2).toISOString(),
      },
      {
        tipo: 'cliente_cadastrado',
        descricao: `Novo cliente cadastrado: ${cliente.nome}.`,
        created_at: data(1).toISOString(),
      },
    ]);
  });

  it('pagina sem repetir itens entre as páginas', async () => {
    const token = await autenticarAdmin();
    await semearAtividades();

    const pagina = (page: number) =>
      request(app.getHttpServer())
        .get(rota())
        .query({ page, per_page: 4 })
        .set('Authorization', `Bearer ${token}`);
    const [primeira, segunda, completa] = await Promise.all([
      pagina(1),
      pagina(2),
      request(app.getHttpServer())
        .get(rota())
        .query({ per_page: 50 })
        .set('Authorization', `Bearer ${token}`),
    ]);

    expect(primeira.status).toBe(200);
    expect(segunda.status).toBe(200);
    expect(primeira.body.data).toHaveLength(4);
    expect(segunda.body.data).toHaveLength(2);
    expect(primeira.body.pagination).toEqual({
      current_page: 1,
      last_page: 2,
      per_page: 4,
      total: 6,
    });
    expect(segunda.body.pagination).toEqual({
      current_page: 2,
      last_page: 2,
      per_page: 4,
      total: 6,
    });
    expect([...primeira.body.data, ...segunda.body.data]).toEqual(completa.body.data);
  });

  it('devolve lista vazia com paginação correta além da última página', async () => {
    const token = await autenticarAdmin();
    await semearAtividades();

    const resposta = await request(app.getHttpServer())
      .get(rota())
      .query({ page: 3, per_page: 4 })
      .set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(200);
    expect(resposta.body.data).toEqual([]);
    expect(resposta.body.pagination).toEqual({
      current_page: 3,
      last_page: 2,
      per_page: 4,
      total: 6,
    });
  });

  it('devolve lista vazia quando não há atividades', async () => {
    const token = await autenticarAdmin();

    const resposta = await request(app.getHttpServer())
      .get(rota())
      .set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(200);
    expect(resposta.body.data).toEqual([]);
    expect(resposta.body.pagination).toEqual({
      current_page: 1,
      last_page: 1,
      per_page: 10,
      total: 0,
    });
  });

  it.each([{ page: '0' }, { per_page: '51' }, { per_page: '0' }, { page: 'abc' }])(
    'recusa query inválida %o',
    async (query) => {
      const token = await autenticarAdmin();

      const resposta = await request(app.getHttpServer())
        .get(rota())
        .query(query)
        .set('Authorization', `Bearer ${token}`);

      expect(resposta.status).toBe(400);
    },
  );

  it('recusa sem token', async () => {
    const resposta = await request(app.getHttpServer()).get(rota());

    expect(resposta.status).toBe(401);
  });

  it('recusa sem a feature de acesso ao dashboard', async () => {
    const { token } = await criarUsuarioAutenticado(app, Role.ADMIN);

    const resposta = await request(app.getHttpServer())
      .get(rota())
      .set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(403);
  });

  it('recusa papel sem acesso mesmo com a feature liberada', async () => {
    await liberarFeature(prisma, Feature.ACESSAR_DASHBOARD, [Role.CLIENTE]);
    const { token } = await criarUsuarioAutenticado(app, Role.CLIENTE);

    const resposta = await request(app.getHttpServer())
      .get(rota())
      .set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(403);
  });
});
