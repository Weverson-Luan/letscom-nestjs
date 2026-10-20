import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Feature, MENSAGEM_SEM_PERMISSAO } from 'src/shared/auth/features';
import { Role } from 'src/shared/constants/roles';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { StorageService } from 'src/shared/storage/storage.service';
import { criarAppE2e, PREFIXO_API } from '../helpers/criar-app-e2e';
import { criarUsuarioAutenticado } from '../helpers/criar-usuario-autenticado';
import { liberarFeature } from '../helpers/liberar-feature';
import { limparBanco } from '../helpers/limpar-banco';

const PAPEIS = [Role.ADMIN, Role.CONSULTOR, Role.PRODUCAO, Role.RECEPCAO];

describe('Anotações de cliente (e2e)', () => {
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

  async function liberarFeatures() {
    await liberarFeature(prisma, Feature.VISUALIZAR_ANOTACOES_CLIENTE, PAPEIS);
    await liberarFeature(prisma, Feature.REGISTRAR_ANOTACOES_CLIENTE, PAPEIS);
  }

  async function prepararCenario() {
    await liberarFeatures();
    const consultor = await criarUsuarioAutenticado(app, Role.CONSULTOR);
    const { usuario: cliente } = await criarUsuarioAutenticado(app, Role.CLIENTE);
    return { consultor, cliente, rota: `${PREFIXO_API}/clientes/${cliente.id}/anotacoes` };
  }

  describe('autorização', () => {
    const rotas: Array<[string, 'get' | 'post' | 'put' | 'delete', string]> = [
      ['GET /clientes-anotacoes', 'get', `${PREFIXO_API}/clientes-anotacoes`],
      ['GET /clientes-anotacoes/:id', 'get', `${PREFIXO_API}/clientes-anotacoes/1`],
      ['GET /clientes/:id/anotacoes', 'get', `${PREFIXO_API}/clientes/1/anotacoes`],
      ['POST /clientes/:id/anotacoes', 'post', `${PREFIXO_API}/clientes/1/anotacoes`],
      ['PUT /clientes/:id/anotacoes/:id', 'put', `${PREFIXO_API}/clientes/1/anotacoes/1`],
      ['DELETE /clientes/:id/anotacoes/:id', 'delete', `${PREFIXO_API}/clientes/1/anotacoes/1`],
      ['GET anexo', 'get', `${PREFIXO_API}/clientes/1/anotacoes/1/anexos/1`],
    ];

    it.each(rotas)('%s responde 401 sem token', async (_nome, metodo, url) => {
      const resposta = await request(app.getHttpServer())[metodo](url).send({});
      expect(resposta.status).toBe(401);
    });

    it.each(rotas)('%s responde 403 para papel cliente', async (_nome, metodo, url) => {
      await liberarFeature(prisma, Feature.VISUALIZAR_ANOTACOES_CLIENTE, [Role.CLIENTE]);
      await liberarFeature(prisma, Feature.REGISTRAR_ANOTACOES_CLIENTE, [Role.CLIENTE]);
      const { token } = await criarUsuarioAutenticado(app, Role.CLIENTE);

      const resposta = await request(app.getHttpServer())
        [metodo](url)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(resposta.status).toBe(403);
    });

    it.each(rotas)('%s responde 403 sem a feature liberada', async (_nome, metodo, url) => {
      const { token } = await criarUsuarioAutenticado(app, Role.CONSULTOR);

      const resposta = await request(app.getHttpServer())
        [metodo](url)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(resposta.status).toBe(403);
      expect(resposta.body.message).toBe(MENSAGEM_SEM_PERMISSAO);
    });

    it('só visualizar não permite registrar', async () => {
      await liberarFeature(prisma, Feature.VISUALIZAR_ANOTACOES_CLIENTE, PAPEIS);
      const { token } = await criarUsuarioAutenticado(app, Role.CONSULTOR);
      const { usuario: cliente } = await criarUsuarioAutenticado(app, Role.CLIENTE);
      const rota = `${PREFIXO_API}/clientes/${cliente.id}/anotacoes`;

      const leitura = await request(app.getHttpServer())
        .get(rota)
        .set('Authorization', `Bearer ${token}`);
      const escrita = await request(app.getHttpServer())
        .post(rota)
        .set('Authorization', `Bearer ${token}`)
        .field('conteudo', 'x');

      expect(leitura.status).toBe(200);
      expect(escrita.status).toBe(403);
    });
  });

  describe('POST /clientes/:id/anotacoes', () => {
    it('registra anotação com anexo, grava no banco e no storage', async () => {
      const { consultor, cliente, rota } = await prepararCenario();

      const resposta = await request(app.getHttpServer())
        .post(rota)
        .set('Authorization', `Bearer ${consultor.token}`)
        .field('conteudo', 'Cliente pediu orçamento de 500 crachás.')
        .field('tipo', 'ligacao')
        .attach('anexos', Buffer.from('%PDF-1.4'), 'orçamento.pdf');

      expect(resposta.status).toBe(201);
      expect(resposta.body).toMatchObject({
        code: 201,
        status: 'success',
        message: 'Anotação registrada com sucesso!',
        data: {
          cliente_id: Number(cliente.id),
          tipo: 'ligacao',
          conteudo: 'Cliente pediu orçamento de 500 crachás.',
          autor: {
            id: Number(consultor.usuario.id),
            nome: consultor.usuario.nome,
            tipo: 'interno',
          },
          eh_minha: true,
          editada: false,
          pode_editar: true,
          pode_excluir: true,
          anexos: [{ nome_original: 'orçamento.pdf', tamanho_bytes: 8 }],
        },
      });

      const gravada = await prisma.clienteAnotacao.findUnique({
        where: { id: BigInt(resposta.body.data.id) },
        include: { anexos: true },
      });
      expect(gravada).toMatchObject({ clienteId: cliente.id, autorId: consultor.usuario.id });
      expect(gravada?.anexos).toHaveLength(1);
      expect(arquivos.has(gravada!.anexos[0].filePath)).toBe(true);
    });

    it('400 sem texto e sem anexo', async () => {
      const { consultor, rota } = await prepararCenario();

      const resposta = await request(app.getHttpServer())
        .post(rota)
        .set('Authorization', `Bearer ${consultor.token}`)
        .field('conteudo', '   ');

      expect(resposta.status).toBe(400);
      expect(resposta.body.message).toBe('Escreva uma anotação ou anexe um arquivo.');
      expect(await prisma.clienteAnotacao.count()).toBe(0);
    });

    it('400 com tipo inválido', async () => {
      const { consultor, rota } = await prepararCenario();

      const resposta = await request(app.getHttpServer())
        .post(rota)
        .set('Authorization', `Bearer ${consultor.token}`)
        .field('conteudo', 'x')
        .field('tipo', 'fofoca');

      expect(resposta.status).toBe(400);
    });

    it('400 com extensão não permitida, sem gravar nada', async () => {
      const { consultor, rota } = await prepararCenario();

      const resposta = await request(app.getHttpServer())
        .post(rota)
        .set('Authorization', `Bearer ${consultor.token}`)
        .attach('anexos', Buffer.from('MZ'), 'programa.exe');

      expect(resposta.status).toBe(400);
      expect(storage.put).not.toHaveBeenCalled();
      expect(await prisma.clienteAnotacao.count()).toBe(0);
    });

    it('404 quando o id não é de um cliente', async () => {
      const { consultor } = await prepararCenario();

      const resposta = await request(app.getHttpServer())
        .post(`${PREFIXO_API}/clientes/${consultor.usuario.id}/anotacoes`)
        .set('Authorization', `Bearer ${consultor.token}`)
        .field('conteudo', 'x');

      expect(resposta.status).toBe(404);
    });
  });

  describe('GET /clientes/:id/anotacoes', () => {
    it('lista da mais recente para a mais antiga, ignora excluídas e filtra por tipo', async () => {
      const { consultor, cliente, rota } = await prepararCenario();
      const base = { clienteId: cliente.id, autorId: consultor.usuario.id };
      await prisma.clienteAnotacao.create({
        data: { ...base, conteudo: 'antiga', tipo: 'nota', createdAt: new Date('2026-01-01') },
      });
      await prisma.clienteAnotacao.create({
        data: { ...base, conteudo: 'recente', tipo: 'ligacao', createdAt: new Date('2026-02-01') },
      });
      await prisma.clienteAnotacao.create({
        data: { ...base, conteudo: 'excluida', deletedAt: new Date() },
      });

      const todas = await request(app.getHttpServer())
        .get(rota)
        .set('Authorization', `Bearer ${consultor.token}`);
      const ligacoes = await request(app.getHttpServer())
        .get(`${rota}?tipo=ligacao`)
        .set('Authorization', `Bearer ${consultor.token}`);

      expect(todas.status).toBe(200);
      expect(todas.body.data.map((a: { conteudo: string }) => a.conteudo)).toEqual([
        'recente',
        'antiga',
      ]);
      expect(todas.body.pagination).toEqual({
        current_page: 1,
        last_page: 1,
        per_page: 20,
        total: 2,
      });
      expect(ligacoes.body.data).toHaveLength(1);
    });

    it('400 com filtro de tipo inválido', async () => {
      const { consultor, rota } = await prepararCenario();

      const resposta = await request(app.getHttpServer())
        .get(`${rota}?tipo=xpto`)
        .set('Authorization', `Bearer ${consultor.token}`);

      expect(resposta.status).toBe(400);
    });
  });

  describe('PUT e DELETE', () => {
    it('autor edita e marca como editada; outro operador recebe 403', async () => {
      const { consultor, cliente, rota } = await prepararCenario();
      const outro = await criarUsuarioAutenticado(app, Role.PRODUCAO);
      const anotacao = await prisma.clienteAnotacao.create({
        data: { clienteId: cliente.id, autorId: consultor.usuario.id, conteudo: 'original' },
      });

      const negado = await request(app.getHttpServer())
        .put(`${rota}/${anotacao.id}`)
        .set('Authorization', `Bearer ${outro.token}`)
        .send({ conteudo: 'invasão' });
      const editado = await request(app.getHttpServer())
        .put(`${rota}/${anotacao.id}`)
        .set('Authorization', `Bearer ${consultor.token}`)
        .send({ conteudo: 'corrigido', tipo: 'email' });

      expect(negado.status).toBe(403);
      expect(editado.status).toBe(200);
      expect(editado.body.data).toMatchObject({
        conteudo: 'corrigido',
        tipo: 'email',
        editada: true,
      });
      const gravada = await prisma.clienteAnotacao.findUnique({ where: { id: anotacao.id } });
      expect(gravada?.editadaEm).not.toBeNull();
    });

    it('400 no PUT com conteúdo acima do limite', async () => {
      const { consultor, cliente, rota } = await prepararCenario();
      const anotacao = await prisma.clienteAnotacao.create({
        data: { clienteId: cliente.id, autorId: consultor.usuario.id, conteudo: 'x' },
      });

      const resposta = await request(app.getHttpServer())
        .put(`${rota}/${anotacao.id}`)
        .set('Authorization', `Bearer ${consultor.token}`)
        .send({ conteudo: 'a'.repeat(5001) });

      expect(resposta.status).toBe(400);
    });

    it('admin exclui anotação de outro de forma lógica', async () => {
      const { consultor, cliente, rota } = await prepararCenario();
      const admin = await criarUsuarioAutenticado(app, Role.ADMIN);
      const anotacao = await prisma.clienteAnotacao.create({
        data: { clienteId: cliente.id, autorId: consultor.usuario.id, conteudo: 'x' },
      });

      const resposta = await request(app.getHttpServer())
        .delete(`${rota}/${anotacao.id}`)
        .set('Authorization', `Bearer ${admin.token}`);

      expect(resposta.status).toBe(200);
      expect(resposta.body).toEqual({
        code: 200,
        status: 'success',
        message: 'Anotação excluída com sucesso!',
        data: null,
        pagination: null,
      });
      const gravada = await prisma.clienteAnotacao.findUnique({ where: { id: anotacao.id } });
      expect(gravada?.deletedAt).not.toBeNull();
    });

    it('403 ao excluir anotação de outro sem ser admin, sem apagar', async () => {
      const { consultor, cliente, rota } = await prepararCenario();
      const producao = await criarUsuarioAutenticado(app, Role.PRODUCAO);
      const anotacao = await prisma.clienteAnotacao.create({
        data: { clienteId: cliente.id, autorId: consultor.usuario.id, conteudo: 'x' },
      });

      const resposta = await request(app.getHttpServer())
        .delete(`${rota}/${anotacao.id}`)
        .set('Authorization', `Bearer ${producao.token}`);

      expect(resposta.status).toBe(403);
      const gravada = await prisma.clienteAnotacao.findUnique({ where: { id: anotacao.id } });
      expect(gravada?.deletedAt).toBeNull();
    });

    it('400 com id não numérico', async () => {
      const { consultor, rota } = await prepararCenario();

      const resposta = await request(app.getHttpServer())
        .delete(`${rota}/abc`)
        .set('Authorization', `Bearer ${consultor.token}`);

      expect(resposta.status).toBe(400);
    });

    it('404 ao editar anotação usando outro cliente na rota', async () => {
      const { consultor, cliente } = await prepararCenario();
      const { usuario: outroCliente } = await criarUsuarioAutenticado(app, Role.CLIENTE);
      const anotacao = await prisma.clienteAnotacao.create({
        data: { clienteId: cliente.id, autorId: consultor.usuario.id, conteudo: 'x' },
      });

      const resposta = await request(app.getHttpServer())
        .put(`${PREFIXO_API}/clientes/${outroCliente.id}/anotacoes/${anotacao.id}`)
        .set('Authorization', `Bearer ${consultor.token}`)
        .send({ conteudo: 'y' });

      expect(resposta.status).toBe(404);
    });
  });

  describe('GET anexo', () => {
    it('baixa o arquivo com o nome original e 404 para anexo de outro cliente', async () => {
      const { consultor, rota } = await prepararCenario();
      const criada = await request(app.getHttpServer())
        .post(rota)
        .set('Authorization', `Bearer ${consultor.token}`)
        .attach('anexos', Buffer.from('a;b\n1;2'), 'contatos.csv');
      const { id, anexos } = criada.body.data;
      const { usuario: outroCliente } = await criarUsuarioAutenticado(app, Role.CLIENTE);

      const baixado = await request(app.getHttpServer())
        .get(`${rota}/${id}/anexos/${anexos[0].id}`)
        .set('Authorization', `Bearer ${consultor.token}`)
        .buffer(true);
      const deOutro = await request(app.getHttpServer())
        .get(`${PREFIXO_API}/clientes/${outroCliente.id}/anotacoes/${id}/anexos/${anexos[0].id}`)
        .set('Authorization', `Bearer ${consultor.token}`);

      expect(baixado.status).toBe(200);
      expect(baixado.headers['content-disposition']).toContain('contatos.csv');
      expect(baixado.text).toBe('a;b\n1;2');
      expect(deOutro.status).toBe(404);
    });
  });

  describe('GET /clientes-anotacoes', () => {
    it('lista só clientes, com total e último contato, quem tem anotação primeiro', async () => {
      const { consultor, cliente } = await prepararCenario();
      const { usuario: semAnotacao } = await criarUsuarioAutenticado(app, Role.CLIENTE);
      await prisma.clienteAnotacao.createMany({
        data: [
          { clienteId: cliente.id, autorId: consultor.usuario.id, conteudo: 'a' },
          { clienteId: cliente.id, autorId: consultor.usuario.id, conteudo: 'b' },
        ],
      });

      const resposta = await request(app.getHttpServer())
        .get(`${PREFIXO_API}/clientes-anotacoes`)
        .set('Authorization', `Bearer ${consultor.token}`);

      expect(resposta.status).toBe(200);
      expect(resposta.body.pagination.total).toBe(2);
      expect(resposta.body.data).toEqual([
        expect.objectContaining({ id: Number(cliente.id), total_anotacoes: 2, ativo: true }),
        expect.objectContaining({
          id: Number(semAnotacao.id),
          total_anotacoes: 0,
          ultima_anotacao_em: null,
        }),
      ]);
    });

    it('filtra pela busca e responde 400 com ordenação inválida', async () => {
      const { consultor, cliente } = await prepararCenario();
      await criarUsuarioAutenticado(app, Role.CLIENTE);

      const filtrada = await request(app.getHttpServer())
        .get(`${PREFIXO_API}/clientes-anotacoes?search=${encodeURIComponent(cliente.email)}`)
        .set('Authorization', `Bearer ${consultor.token}`);
      const invalida = await request(app.getHttpServer())
        .get(`${PREFIXO_API}/clientes-anotacoes?order=xpto`)
        .set('Authorization', `Bearer ${consultor.token}`);

      expect(filtrada.status).toBe(200);
      expect(filtrada.body.data).toEqual([expect.objectContaining({ id: Number(cliente.id) })]);
      expect(invalida.status).toBe(400);
    });

    it('GET /clientes-anotacoes/:id devolve o resumo sem contar excluídas', async () => {
      const { consultor, cliente } = await prepararCenario();
      await prisma.clienteAnotacao.createMany({
        data: [
          { clienteId: cliente.id, autorId: consultor.usuario.id, conteudo: 'ativa' },
          {
            clienteId: cliente.id,
            autorId: consultor.usuario.id,
            conteudo: 'excluida',
            deletedAt: new Date(),
          },
        ],
      });

      const resposta = await request(app.getHttpServer())
        .get(`${PREFIXO_API}/clientes-anotacoes/${cliente.id}`)
        .set('Authorization', `Bearer ${consultor.token}`);

      expect(resposta.status).toBe(200);
      expect(resposta.body).toMatchObject({
        code: 200,
        status: 'success',
        message: 'Cliente carregado com sucesso!',
        data: {
          id: Number(cliente.id),
          nome: cliente.nome,
          email: cliente.email,
          telefone: cliente.telefone,
          documento: cliente.documento,
          ativo: true,
          total_anotacoes: 1,
          ultima_anotacao_em: expect.any(String),
        },
      });
    });

    it('GET /clientes-anotacoes/:id devolve 404 para quem não é cliente', async () => {
      const { consultor } = await prepararCenario();

      const resposta = await request(app.getHttpServer())
        .get(`${PREFIXO_API}/clientes-anotacoes/${consultor.usuario.id}`)
        .set('Authorization', `Bearer ${consultor.token}`);

      expect(resposta.status).toBe(404);
    });
  });
});
