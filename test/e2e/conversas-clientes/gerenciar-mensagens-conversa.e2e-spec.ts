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

describe('Mensagens de cliente (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const arquivos = new Map<string, Buffer>();
  const storage = {
    montarCaminho: jest.fn((relativo: string) => relativo),
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
    await liberarFeature(prisma, Feature.VISUALIZAR_CONVERSA_CLIENTE, PAPEIS);
    await liberarFeature(prisma, Feature.ENVIAR_MENSAGENS_CONVERSA_CLIENTE, PAPEIS);
  }

  async function prepararCenario() {
    await liberarFeatures();
    const consultor = await criarUsuarioAutenticado(app, Role.CONSULTOR);
    const { usuario: cliente } = await criarUsuarioAutenticado(app, Role.CLIENTE);
    return { consultor, cliente, rota: `${PREFIXO_API}/clientes/${cliente.id}/conversa/mensagens` };
  }

  describe('autorização', () => {
    const rotas: Array<[string, 'get' | 'post' | 'put' | 'delete', string]> = [
      ['GET /conversas-clientes', 'get', `${PREFIXO_API}/conversas-clientes`],
      ['GET /conversas-clientes/:id', 'get', `${PREFIXO_API}/conversas-clientes/1`],
      [
        'GET /clientes/:id/conversa/mensagens',
        'get',
        `${PREFIXO_API}/clientes/1/conversa/mensagens`,
      ],
      [
        'POST /clientes/:id/conversa/mensagens',
        'post',
        `${PREFIXO_API}/clientes/1/conversa/mensagens`,
      ],
      [
        'PUT /clientes/:id/conversa/mensagens/:id',
        'put',
        `${PREFIXO_API}/clientes/1/conversa/mensagens/1`,
      ],
      [
        'DELETE /clientes/:id/conversa/mensagens/:id',
        'delete',
        `${PREFIXO_API}/clientes/1/conversa/mensagens/1`,
      ],
      ['GET anexo', 'get', `${PREFIXO_API}/clientes/1/conversa/mensagens/1/anexos/1`],
    ];

    it.each(rotas)('%s responde 401 sem token', async (_nome, metodo, url) => {
      const resposta = await request(app.getHttpServer())[metodo](url).send({});
      expect(resposta.status).toBe(401);
    });

    it.each(rotas)('%s responde 403 para papel cliente', async (_nome, metodo, url) => {
      await liberarFeature(prisma, Feature.VISUALIZAR_CONVERSA_CLIENTE, [Role.CLIENTE]);
      await liberarFeature(prisma, Feature.ENVIAR_MENSAGENS_CONVERSA_CLIENTE, [Role.CLIENTE]);
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
      await liberarFeature(prisma, Feature.VISUALIZAR_CONVERSA_CLIENTE, PAPEIS);
      const { token } = await criarUsuarioAutenticado(app, Role.CONSULTOR);
      const { usuario: cliente } = await criarUsuarioAutenticado(app, Role.CLIENTE);
      const rota = `${PREFIXO_API}/clientes/${cliente.id}/conversa/mensagens`;

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

  describe('POST /clientes/:id/conversa/mensagens', () => {
    it('registra mensagem com anexo, grava no banco e no storage', async () => {
      const { consultor, cliente, rota } = await prepararCenario();

      const resposta = await request(app.getHttpServer())
        .post(rota)
        .set('Authorization', `Bearer ${consultor.token}`)
        .field('conteudo', 'Cliente pediu orçamento de 500 crachás.')
        .attach('anexos', Buffer.from('%PDF-1.4'), 'orçamento.pdf');

      expect(resposta.status).toBe(201);
      expect(resposta.body).toMatchObject({
        code: 201,
        status: 'success',
        message: 'Mensagem registrada com sucesso!',
        data: {
          cliente_id: Number(cliente.id),
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

      const gravada = await prisma.conversaMensagem.findUnique({
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
      expect(resposta.body.message).toBe('Escreva uma mensagem ou anexe um arquivo.');
      expect(await prisma.conversaMensagem.count()).toBe(0);
    });

    it('400 com extensão não permitida, sem gravar nada', async () => {
      const { consultor, rota } = await prepararCenario();

      const resposta = await request(app.getHttpServer())
        .post(rota)
        .set('Authorization', `Bearer ${consultor.token}`)
        .attach('anexos', Buffer.from('MZ'), 'programa.exe');

      expect(resposta.status).toBe(400);
      expect(storage.put).not.toHaveBeenCalled();
      expect(await prisma.conversaMensagem.count()).toBe(0);
    });

    it('404 quando o id não é de um cliente', async () => {
      const { consultor } = await prepararCenario();

      const resposta = await request(app.getHttpServer())
        .post(`${PREFIXO_API}/clientes/${consultor.usuario.id}/conversa/mensagens`)
        .set('Authorization', `Bearer ${consultor.token}`)
        .field('conteudo', 'x');

      expect(resposta.status).toBe(404);
    });
  });

  describe('GET /clientes/:id/conversa/mensagens', () => {
    it('lista da mais recente para a mais antiga, ignora excluídas e filtra pela busca', async () => {
      const { consultor, cliente, rota } = await prepararCenario();
      const base = { clienteId: cliente.id, autorId: consultor.usuario.id };
      await prisma.conversaMensagem.create({
        data: { ...base, conteudo: 'antiga', createdAt: new Date('2026-01-01') },
      });
      await prisma.conversaMensagem.create({
        data: { ...base, conteudo: 'recente', createdAt: new Date('2026-02-01') },
      });
      await prisma.conversaMensagem.create({
        data: { ...base, conteudo: 'excluida', deletedAt: new Date() },
      });

      const todas = await request(app.getHttpServer())
        .get(rota)
        .set('Authorization', `Bearer ${consultor.token}`);
      const busca = await request(app.getHttpServer())
        .get(`${rota}?search=recen`)
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
      expect(busca.body.data.map((a: { conteudo: string }) => a.conteudo)).toEqual(['recente']);
    });

    it('400 com ordenação inválida', async () => {
      const { consultor, rota } = await prepararCenario();

      const resposta = await request(app.getHttpServer())
        .get(`${rota}?order=xpto`)
        .set('Authorization', `Bearer ${consultor.token}`);

      expect(resposta.status).toBe(400);
    });
  });

  describe('PUT e DELETE', () => {
    it('autor edita e marca como editada; outro operador recebe 403', async () => {
      const { consultor, cliente, rota } = await prepararCenario();
      const outro = await criarUsuarioAutenticado(app, Role.PRODUCAO);
      const mensagem = await prisma.conversaMensagem.create({
        data: { clienteId: cliente.id, autorId: consultor.usuario.id, conteudo: 'original' },
      });

      const negado = await request(app.getHttpServer())
        .put(`${rota}/${mensagem.id}`)
        .set('Authorization', `Bearer ${outro.token}`)
        .send({ conteudo: 'invasão' });
      const editado = await request(app.getHttpServer())
        .put(`${rota}/${mensagem.id}`)
        .set('Authorization', `Bearer ${consultor.token}`)
        .send({ conteudo: 'corrigido' });

      expect(negado.status).toBe(403);
      expect(editado.status).toBe(200);
      expect(editado.body.data).toMatchObject({
        conteudo: 'corrigido',
        editada: true,
      });
      const gravada = await prisma.conversaMensagem.findUnique({ where: { id: mensagem.id } });
      expect(gravada?.editadaEm).not.toBeNull();
    });

    it('400 no PUT com conteúdo acima do limite', async () => {
      const { consultor, cliente, rota } = await prepararCenario();
      const mensagem = await prisma.conversaMensagem.create({
        data: { clienteId: cliente.id, autorId: consultor.usuario.id, conteudo: 'x' },
      });

      const resposta = await request(app.getHttpServer())
        .put(`${rota}/${mensagem.id}`)
        .set('Authorization', `Bearer ${consultor.token}`)
        .send({ conteudo: 'a'.repeat(5001) });

      expect(resposta.status).toBe(400);
    });

    it('admin exclui mensagem de outro de forma lógica', async () => {
      const { consultor, cliente, rota } = await prepararCenario();
      const admin = await criarUsuarioAutenticado(app, Role.ADMIN);
      const mensagem = await prisma.conversaMensagem.create({
        data: { clienteId: cliente.id, autorId: consultor.usuario.id, conteudo: 'x' },
      });

      const resposta = await request(app.getHttpServer())
        .delete(`${rota}/${mensagem.id}`)
        .set('Authorization', `Bearer ${admin.token}`);

      expect(resposta.status).toBe(200);
      expect(resposta.body).toEqual({
        code: 200,
        status: 'success',
        message: 'Mensagem excluída com sucesso!',
        data: null,
        pagination: null,
      });
      const gravada = await prisma.conversaMensagem.findUnique({ where: { id: mensagem.id } });
      expect(gravada?.deletedAt).not.toBeNull();
    });

    it('403 ao excluir mensagem de outro sem ser admin, sem apagar', async () => {
      const { consultor, cliente, rota } = await prepararCenario();
      const producao = await criarUsuarioAutenticado(app, Role.PRODUCAO);
      const mensagem = await prisma.conversaMensagem.create({
        data: { clienteId: cliente.id, autorId: consultor.usuario.id, conteudo: 'x' },
      });

      const resposta = await request(app.getHttpServer())
        .delete(`${rota}/${mensagem.id}`)
        .set('Authorization', `Bearer ${producao.token}`);

      expect(resposta.status).toBe(403);
      const gravada = await prisma.conversaMensagem.findUnique({ where: { id: mensagem.id } });
      expect(gravada?.deletedAt).toBeNull();
    });

    it('400 com id não numérico', async () => {
      const { consultor, rota } = await prepararCenario();

      const resposta = await request(app.getHttpServer())
        .delete(`${rota}/abc`)
        .set('Authorization', `Bearer ${consultor.token}`);

      expect(resposta.status).toBe(400);
    });

    it('404 ao editar mensagem usando outro cliente na rota', async () => {
      const { consultor, cliente } = await prepararCenario();
      const { usuario: outroCliente } = await criarUsuarioAutenticado(app, Role.CLIENTE);
      const mensagem = await prisma.conversaMensagem.create({
        data: { clienteId: cliente.id, autorId: consultor.usuario.id, conteudo: 'x' },
      });

      const resposta = await request(app.getHttpServer())
        .put(`${PREFIXO_API}/clientes/${outroCliente.id}/conversa/mensagens/${mensagem.id}`)
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
        .get(
          `${PREFIXO_API}/clientes/${outroCliente.id}/conversa/mensagens/${id}/anexos/${anexos[0].id}`,
        )
        .set('Authorization', `Bearer ${consultor.token}`);

      expect(baixado.status).toBe(200);
      expect(baixado.headers['content-disposition']).toContain('contatos.csv');
      expect(baixado.text).toBe('a;b\n1;2');
      expect(deOutro.status).toBe(404);
    });
  });

  describe('GET /conversas-clientes', () => {
    it('lista só clientes, com total e último contato, quem tem mensagem primeiro', async () => {
      const { consultor, cliente } = await prepararCenario();
      const { usuario: semMensagem } = await criarUsuarioAutenticado(app, Role.CLIENTE);
      await prisma.conversaMensagem.createMany({
        data: [
          { clienteId: cliente.id, autorId: consultor.usuario.id, conteudo: 'a' },
          { clienteId: cliente.id, autorId: consultor.usuario.id, conteudo: 'b' },
        ],
      });

      const resposta = await request(app.getHttpServer())
        .get(`${PREFIXO_API}/conversas-clientes`)
        .set('Authorization', `Bearer ${consultor.token}`);

      expect(resposta.status).toBe(200);
      expect(resposta.body.pagination.total).toBe(2);
      expect(resposta.body.data).toEqual([
        expect.objectContaining({ id: Number(cliente.id), total_mensagens: 2, ativo: true }),
        expect.objectContaining({
          id: Number(semMensagem.id),
          total_mensagens: 0,
          ultima_mensagem_em: null,
        }),
      ]);
    });

    it('filtra pela busca e responde 400 com ordenação inválida', async () => {
      const { consultor, cliente } = await prepararCenario();
      await criarUsuarioAutenticado(app, Role.CLIENTE);

      const filtrada = await request(app.getHttpServer())
        .get(`${PREFIXO_API}/conversas-clientes?search=${encodeURIComponent(cliente.email)}`)
        .set('Authorization', `Bearer ${consultor.token}`);
      const invalida = await request(app.getHttpServer())
        .get(`${PREFIXO_API}/conversas-clientes?order=xpto`)
        .set('Authorization', `Bearer ${consultor.token}`);

      expect(filtrada.status).toBe(200);
      expect(filtrada.body.data).toEqual([expect.objectContaining({ id: Number(cliente.id) })]);
      expect(invalida.status).toBe(400);
    });

    it('GET /conversas-clientes/:id devolve o resumo sem contar excluídas', async () => {
      const { consultor, cliente } = await prepararCenario();
      await prisma.conversaMensagem.createMany({
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
        .get(`${PREFIXO_API}/conversas-clientes/${cliente.id}`)
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
          total_mensagens: 1,
          ultima_mensagem_em: expect.any(String),
        },
      });
    });

    it('GET /conversas-clientes/:id devolve 404 para quem não é cliente', async () => {
      const { consultor } = await prepararCenario();

      const resposta = await request(app.getHttpServer())
        .get(`${PREFIXO_API}/conversas-clientes/${consultor.usuario.id}`)
        .set('Authorization', `Bearer ${consultor.token}`);

      expect(resposta.status).toBe(404);
    });
  });
});
