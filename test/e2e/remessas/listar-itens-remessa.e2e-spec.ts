/**
 * IMPORTS
 */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';

// shared / prisma (conexão com o banco)
import { PrismaService } from 'src/shared/prisma/prisma.service';

// shared / auth (features e mensagens de permissão)
import { Feature, MENSAGEM_SEM_PERMISSAO } from 'src/shared/auth/features';

// shared / roles
import { Role } from 'src/shared/constants/roles';

// shared / storage (substituído: o teste não depende de arquivos reais)
import { StorageService } from 'src/shared/storage/storage.service';

// helpers e2e (app, banco, autenticação e features)
import { criarAppE2e, PREFIXO_API } from '../helpers/criar-app-e2e';
import { criarUsuarioAutenticado } from '../helpers/criar-usuario-autenticado';
import { liberarFeature } from '../helpers/liberar-feature';
import { limparBanco } from '../helpers/limpar-banco';

const PLANILHA_CSV = 'matricula,nome,cargo\n001,Ana Souza,Analista\n002,Bruno Lima,\n';

describe('Itens da remessa — GET /remessas/:id/itens (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const storage = {
    download: jest.fn(),
    getSignedUrl: jest.fn(async (caminho: string) => `https://storage.test/${caminho}`),
  };

  beforeAll(async () => {
    app = await criarAppE2e((builder) =>
      builder.overrideProvider(StorageService).useValue(storage),
    );
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await limparBanco(prisma);
    storage.download.mockReset().mockResolvedValue(Buffer.from(PLANILHA_CSV));
  });

  afterAll(async () => {
    await app?.close();
  });

  let numeroRemessa = 70000;

  async function criarRemessa(
    clienteId: bigint,
    opcoes: { comPlanilha?: boolean; matriculas?: string[] } = {},
  ) {
    const { comPlanilha = true, matriculas = ['001', '002', '003'] } = opcoes;
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
        nomeModelo: 'Crachá',
        campoChave: 'matricula',
        temCargaFoto: true,
      },
    });
    numeroRemessa += 1;
    const remessa = await prisma.remessa.create({
      data: {
        clienteId,
        modeloTecnicoId: modelo.id,
        tecnologiaId: tecnologia.id,
        totalSolicitacoes: matriculas.length,
        numeroRemessa: BigInt(numeroRemessa),
      },
    });
    for (const matricula of matriculas) {
      await prisma.remessaFoto.create({
        data: {
          remessaId: remessa.id,
          clienteId,
          filePath: `remessas/${remessa.id}/fotos/${matricula}.jpg`,
          nome: `Foto ${matricula}`,
          matricula,
        },
      });
    }
    if (comPlanilha) {
      await prisma.remessaPlanilha.create({
        data: {
          remessaId: remessa.id,
          clienteId,
          filePath: `remessas/${remessa.id}/planilhas/a.csv`,
          tipo: 'csv',
        },
      });
    }
    return remessa;
  }

  function listarItens(remessaId: bigint | string, token?: string) {
    const chamada = request(app.getHttpServer()).get(`${PREFIXO_API}/remessas/${remessaId}/itens`);
    if (token) chamada.set('Authorization', `Bearer ${token}`);
    return chamada;
  }

  async function autenticarCliente() {
    await liberarFeature(prisma, Feature.VISUALIZAR_REMESSAS_ANDAMENTO, [Role.CLIENTE]);
    return criarUsuarioAutenticado(app, Role.CLIENTE);
  }

  it('responde 401 sem token', async () => {
    const resposta = await listarItens(1n);

    expect(resposta.status).toBe(401);
  });

  it('responde 403 sem a feature liberada', async () => {
    const { usuario, token } = await criarUsuarioAutenticado(app, Role.CLIENTE);
    const remessa = await criarRemessa(usuario.id);

    const resposta = await listarItens(remessa.id, token);

    expect(resposta.status).toBe(403);
    expect(resposta.body.message).toBe(MENSAGEM_SEM_PERMISSAO);
  });

  it('responde 400 quando o id não é numérico', async () => {
    const { token } = await autenticarCliente();

    const resposta = await listarItens('abc', token);

    expect(resposta.status).toBe(400);
  });

  it('responde 404 quando a remessa é de outro cliente', async () => {
    const { token } = await autenticarCliente();
    const { usuario: outroCliente } = await criarUsuarioAutenticado(app, Role.CLIENTE);
    const remessa = await criarRemessa(outroCliente.id);

    const resposta = await listarItens(remessa.id, token);

    expect(resposta.status).toBe(404);
  });

  it('devolve as linhas da planilha, com a foto quando a linha tem foto', async () => {
    const { usuario, token } = await autenticarCliente();
    // a 002 não tem foto; a foto 003 não está na planilha e não aparece
    const remessa = await criarRemessa(usuario.id, { matriculas: ['001', '003'] });

    const resposta = await listarItens(remessa.id, token);

    expect(resposta.status).toBe(200);
    expect(resposta.body.message).toBe('Itens da remessa carregados com sucesso!');
    expect(resposta.body.data.colunas).toEqual(['matricula', 'nome', 'cargo']);
    expect(resposta.body.data.itens).toEqual([
      {
        foto_id: expect.any(Number),
        matricula: '001',
        url: `https://storage.test/remessas/${remessa.id}/fotos/001.jpg`,
        created_at: expect.stringMatching(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/),
        dados: { matricula: '001', nome: 'Ana Souza', cargo: 'Analista' },
      },
      {
        foto_id: null,
        matricula: null,
        url: null,
        created_at: expect.any(String),
        dados: { matricula: '002', nome: 'Bruno Lima', cargo: '' },
      },
    ]);
    expect(storage.download).toHaveBeenCalledWith(`remessas/${remessa.id}/planilhas/a.csv`);
  });

  it('devolve lista vazia quando a remessa não tem planilha', async () => {
    const { usuario, token } = await autenticarCliente();
    const remessa = await criarRemessa(usuario.id, { comPlanilha: false });

    const resposta = await listarItens(remessa.id, token);

    expect(resposta.status).toBe(200);
    expect(resposta.body.data).toEqual({ colunas: [], itens: [] });
    expect(storage.download).not.toHaveBeenCalled();
  });

  it('devolve os dados da planilha sem foto quando a remessa não tem fotos', async () => {
    const { usuario, token } = await autenticarCliente();
    const remessa = await criarRemessa(usuario.id, { matriculas: [] });

    const resposta = await listarItens(remessa.id, token);

    expect(resposta.status).toBe(200);
    expect(resposta.body.data.itens).toHaveLength(2);
    expect(resposta.body.data.itens.map((item: { url: string | null }) => item.url)).toEqual([
      null,
      null,
    ]);
  });
});
