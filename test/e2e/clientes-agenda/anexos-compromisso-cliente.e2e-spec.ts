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

describe('Agenda do cliente — anexos dos compromissos (e2e)', () => {
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

  async function prepararCenario() {
    await liberarFeature(prisma, Feature.VISUALIZAR_AGENDA_CLIENTE, PAPEIS);
    await liberarFeature(prisma, Feature.GERENCIAR_AGENDA_CLIENTE, PAPEIS);
    const consultor = await criarUsuarioAutenticado(app, Role.CONSULTOR);
    const cliente = await criarUsuarioAutenticado(app, Role.CLIENTE);
    return {
      consultor,
      cliente: cliente.usuario,
      tokenCliente: cliente.token,
      rota: `${PREFIXO_API}/clientes/${cliente.usuario.id}/agenda`,
    };
  }

  function criarComAnexo(rota: string, token: string) {
    return request(app.getHttpServer())
      .post(rota)
      .set('Authorization', `Bearer ${token}`)
      .field('titulo', 'Reunião com anexos')
      .field('agendado_para', '2026-10-21T14:00:00.000Z')
      .field('visivel_cliente', 'true')
      .attach('anexos', Buffer.from('a;b\n1;2'), 'contatos.csv');
  }

  describe('POST /clientes/:id/agenda (multipart)', () => {
    it('cria com anexos, campos em texto convertidos, grava no banco e no storage', async () => {
      const { consultor, cliente, rota } = await prepararCenario();

      const resposta = await request(app.getHttpServer())
        .post(rota)
        .set('Authorization', `Bearer ${consultor.token}`)
        .field('titulo', 'Apresentar proposta')
        .field('tipo', 'reuniao')
        .field('agendado_para', '2026-10-21T14:00:00.000Z')
        .field('responsavel_id', String(consultor.usuario.id))
        .field('responsavel_subordinado_id', '')
        .field('visivel_cliente', 'false')
        .field('descricao', '')
        .attach('anexos', Buffer.from('%PDF-1.4'), 'orçamento.pdf')
        .attach('anexos', Buffer.from('png'), {
          filename: 'foto.png',
          contentType: 'image/png',
        });

      expect(resposta.status).toBe(201);
      expect(resposta.body.message).toBe('Compromisso criado com sucesso!');
      expect(resposta.body.data).toEqual(
        expect.objectContaining({
          cliente_id: Number(cliente.id),
          tipo: 'reuniao',
          titulo: 'Apresentar proposta',
          descricao: null,
          visivel_cliente: false,
          responsavel: {
            tipo: 'interno',
            id: Number(consultor.usuario.id),
            nome: consultor.usuario.nome,
          },
          anexos: [
            {
              id: expect.any(Number),
              nome: 'orçamento.pdf',
              mime_type: 'application/pdf',
              tamanho_bytes: 8,
              created_at: expect.any(String),
            },
            {
              id: expect.any(Number),
              nome: 'foto.png',
              mime_type: 'image/png',
              tamanho_bytes: 3,
              created_at: expect.any(String),
            },
          ],
        }),
      );
      const [primeiro, segundo] = resposta.body.data.anexos;
      expect(primeiro.id).toBeLessThan(segundo.id);

      const salvos = await prisma.clienteCompromissoAnexo.findMany({
        where: { compromissoId: BigInt(resposta.body.data.id) },
        orderBy: { id: 'asc' },
      });
      expect(salvos).toHaveLength(2);
      expect(salvos[0]).toEqual(
        expect.objectContaining({ nomeOriginal: 'orçamento.pdf', tamanhoBytes: 8 }),
      );
      expect(salvos[0].filePath).toMatch(
        new RegExp(`^clientes/${cliente.id}/agenda/compromissos/[0-9a-f-]+\\.pdf$`),
      );
      expect(arquivos.has(salvos[0].filePath)).toBe(true);
      expect(arquivos.has(salvos[1].filePath)).toBe(true);
    });

    it('multipart sem arquivos cria normalmente', async () => {
      const { consultor, rota } = await prepararCenario();

      const resposta = await request(app.getHttpServer())
        .post(rota)
        .set('Authorization', `Bearer ${consultor.token}`)
        .field('titulo', 'Ligar')
        .field('agendado_para', '2026-10-21T14:00:00.000Z');

      expect(resposta.status).toBe(201);
      expect(resposta.body.data.anexos).toEqual([]);
      expect(storage.put).not.toHaveBeenCalled();
    });

    it('JSON sem anexos continua respondendo 201', async () => {
      const { consultor, rota } = await prepararCenario();

      const resposta = await request(app.getHttpServer())
        .post(rota)
        .set('Authorization', `Bearer ${consultor.token}`)
        .send({
          titulo: 'Ligar',
          agendado_para: '2026-10-21T14:00:00.000Z',
          visivel_cliente: true,
        });

      expect(resposta.status).toBe(201);
      expect(resposta.body.data).toEqual(
        expect.objectContaining({ visivel_cliente: true, anexos: [] }),
      );
    });

    it('400 com extensão não permitida, sem gravar nada', async () => {
      const { consultor, rota } = await prepararCenario();

      const resposta = await request(app.getHttpServer())
        .post(rota)
        .set('Authorization', `Bearer ${consultor.token}`)
        .field('titulo', 'x')
        .field('agendado_para', '2026-10-21T14:00:00.000Z')
        .attach('anexos', Buffer.from('MZ'), 'programa.exe');

      expect(resposta.status).toBe(400);
      expect(resposta.body.message).toBe('Tipo de arquivo não permitido: programa.exe.');
      expect(storage.put).not.toHaveBeenCalled();
      expect(await prisma.clienteCompromisso.count()).toBe(0);
      expect(await prisma.clienteCompromissoAnexo.count()).toBe(0);
    });

    it('400 com mais de 5 arquivos, sem gravar nada', async () => {
      const { consultor, rota } = await prepararCenario();

      let requisicao = request(app.getHttpServer())
        .post(rota)
        .set('Authorization', `Bearer ${consultor.token}`)
        .field('titulo', 'x')
        .field('agendado_para', '2026-10-21T14:00:00.000Z');
      for (let i = 0; i < 6; i += 1) {
        requisicao = requisicao.attach('anexos', Buffer.from('x'), `arquivo${i}.txt`);
      }
      const resposta = await requisicao;

      expect(resposta.status).toBe(400);
      expect(storage.put).not.toHaveBeenCalled();
      expect(await prisma.clienteCompromisso.count()).toBe(0);
      expect(await prisma.clienteCompromissoAnexo.count()).toBe(0);
    });

    it('400 com campos inválidos no multipart, sem subir arquivos', async () => {
      const { consultor, rota } = await prepararCenario();

      const resposta = await request(app.getHttpServer())
        .post(rota)
        .set('Authorization', `Bearer ${consultor.token}`)
        .field('titulo', 'x')
        .field('agendado_para', 'amanhã')
        .attach('anexos', Buffer.from('x'), 'a.txt');

      expect(resposta.status).toBe(400);
      expect(storage.put).not.toHaveBeenCalled();
      expect(await prisma.clienteCompromisso.count()).toBe(0);
    });

    it('/minha-agenda não expõe os anexos ao cliente', async () => {
      const { consultor, rota, tokenCliente } = await prepararCenario();
      await liberarFeature(prisma, Feature.ACESSAR_AGENDA_CLIENTE, [Role.CLIENTE]);
      expect((await criarComAnexo(rota, consultor.token)).status).toBe(201);

      const resposta = await request(app.getHttpServer())
        .get(`${PREFIXO_API}/minha-agenda`)
        .set('Authorization', `Bearer ${tokenCliente}`);

      expect(resposta.status).toBe(200);
      expect(resposta.body.data).toHaveLength(1);
      expect(resposta.body.data[0]).not.toHaveProperty('anexos');
    });
  });

  describe('GET /clientes/:id/agenda/:id/anexos/:anexoId', () => {
    it('baixa o arquivo com nome original, tipo e conteúdo', async () => {
      const { consultor, rota } = await prepararCenario();
      const criado = await criarComAnexo(rota, consultor.token);
      const { id, anexos } = criado.body.data;

      const resposta = await request(app.getHttpServer())
        .get(`${rota}/${id}/anexos/${anexos[0].id}`)
        .set('Authorization', `Bearer ${consultor.token}`)
        .buffer(true);

      expect(resposta.status).toBe(200);
      expect(resposta.headers['content-disposition']).toBe(
        `attachment; filename="contatos.csv"; filename*=UTF-8''contatos.csv`,
      );
      expect(resposta.headers['content-type']).toContain('text/csv');
      expect(resposta.text).toBe('a;b\n1;2');
    });

    it('404 para anexo de outro cliente, outro compromisso ou compromisso excluído', async () => {
      const { consultor, cliente, rota } = await prepararCenario();
      const criado = await criarComAnexo(rota, consultor.token);
      const { id, anexos } = criado.body.data;
      const anexoId = anexos[0].id;
      const { usuario: outroCliente } = await criarUsuarioAutenticado(app, Role.CLIENTE);
      const outroCompromisso = await prisma.clienteCompromisso.create({
        data: {
          clienteId: cliente.id,
          autorId: consultor.usuario.id,
          titulo: 'Outro',
          agendadoPara: new Date('2026-10-21T14:00:00.000Z'),
        },
      });
      const baixar = (url: string) =>
        request(app.getHttpServer()).get(url).set('Authorization', `Bearer ${consultor.token}`);

      const deOutroCliente = await baixar(
        `${PREFIXO_API}/clientes/${outroCliente.id}/agenda/${id}/anexos/${anexoId}`,
      );
      const deOutroCompromisso = await baixar(`${rota}/${outroCompromisso.id}/anexos/${anexoId}`);
      const inexistente = await baixar(`${rota}/${id}/anexos/999999`);

      await request(app.getHttpServer())
        .delete(`${rota}/${id}`)
        .set('Authorization', `Bearer ${consultor.token}`)
        .expect(200);
      const excluido = await baixar(`${rota}/${id}/anexos/${anexoId}`);

      for (const resposta of [deOutroCliente, deOutroCompromisso, inexistente, excluido]) {
        expect(resposta.status).toBe(404);
        expect(resposta.body.message).toBe('Anexo não encontrado.');
      }
      // exclusão lógica não apaga o arquivo nem o registro
      expect(storage.delete).not.toHaveBeenCalled();
      expect(await prisma.clienteCompromissoAnexo.count()).toBe(1);
    });

    it('404 quando o arquivo sumiu do storage', async () => {
      const { consultor, rota } = await prepararCenario();
      const criado = await criarComAnexo(rota, consultor.token);
      const { id, anexos } = criado.body.data;
      arquivos.clear();

      const resposta = await request(app.getHttpServer())
        .get(`${rota}/${id}/anexos/${anexos[0].id}`)
        .set('Authorization', `Bearer ${consultor.token}`);

      expect(resposta.status).toBe(404);
    });

    it('401 sem token', async () => {
      const resposta = await request(app.getHttpServer()).get(
        `${PREFIXO_API}/clientes/1/agenda/1/anexos/1`,
      );
      expect(resposta.status).toBe(401);
    });

    it('403 sem a feature de visualizar a agenda', async () => {
      await liberarFeature(prisma, Feature.GERENCIAR_AGENDA_CLIENTE, PAPEIS);
      const { token } = await criarUsuarioAutenticado(app, Role.CONSULTOR);

      const resposta = await request(app.getHttpServer())
        .get(`${PREFIXO_API}/clientes/1/agenda/1/anexos/1`)
        .set('Authorization', `Bearer ${token}`);

      expect(resposta.status).toBe(403);
      expect(resposta.body.message).toBe(MENSAGEM_SEM_PERMISSAO);
    });

    it('403 para papel cliente mesmo com a feature', async () => {
      await liberarFeature(prisma, Feature.VISUALIZAR_AGENDA_CLIENTE, [Role.CLIENTE]);
      const { token } = await criarUsuarioAutenticado(app, Role.CLIENTE);

      const resposta = await request(app.getHttpServer())
        .get(`${PREFIXO_API}/clientes/1/agenda/1/anexos/1`)
        .set('Authorization', `Bearer ${token}`);

      expect(resposta.status).toBe(403);
    });
  });
});
