import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Feature, MENSAGEM_SEM_PERMISSAO } from 'src/shared/auth/features';
import { Role } from 'src/shared/constants/roles';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { criarAppE2e, PREFIXO_API } from '../helpers/criar-app-e2e';
import { criarUsuarioAutenticado } from '../helpers/criar-usuario-autenticado';
import { liberarFeature } from '../helpers/liberar-feature';
import { limparBanco } from '../helpers/limpar-banco';

const PAPEIS = [Role.ADMIN, Role.CONSULTOR, Role.PRODUCAO, Role.RECEPCAO];

describe('Agenda do cliente — rotas internas (e2e)', () => {
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

  async function liberarFeatures() {
    await liberarFeature(prisma, Feature.VISUALIZAR_AGENDA_CLIENTE, PAPEIS);
    await liberarFeature(prisma, Feature.GERENCIAR_AGENDA_CLIENTE, PAPEIS);
  }

  async function prepararCenario() {
    await liberarFeatures();
    const consultor = await criarUsuarioAutenticado(app, Role.CONSULTOR);
    const { usuario: cliente } = await criarUsuarioAutenticado(app, Role.CLIENTE);
    return { consultor, cliente, rota: `${PREFIXO_API}/clientes/${cliente.id}/agenda` };
  }

  function criarSubordinado(
    clienteId: bigint,
    dados: Partial<{ ativo: boolean; nome: string }> = {},
  ) {
    return prisma.userCliente.create({
      data: {
        clienteId,
        email: `sub${clienteId}-${Date.now()}-${Math.random()}@e2e.test`,
        nome: 'Compras',
        documento: '12345678900',
        senha: 'nao-usada',
        ...dados,
      },
    });
  }

  function criarCompromisso(
    clienteId: bigint,
    autorId: bigint,
    dados: Partial<{
      titulo: string;
      agendadoPara: Date;
      status: 'pendente' | 'concluido' | 'cancelado';
      tipo: 'nota' | 'ligacao' | 'reuniao' | 'visita';
      visivelCliente: boolean;
      deletedAt: Date | null;
      responsavelId: bigint | null;
    }> = {},
  ) {
    return prisma.clienteCompromisso.create({
      data: {
        clienteId,
        autorId,
        titulo: 'Compromisso',
        agendadoPara: new Date('2026-10-21T14:00:00.000Z'),
        ...dados,
      },
    });
  }

  describe('autorização', () => {
    const rotas: Array<[string, 'get' | 'post' | 'put' | 'delete', string]> = [
      ['GET /clientes/:id/agenda', 'get', `${PREFIXO_API}/clientes/1/agenda`],
      ['POST /clientes/:id/agenda', 'post', `${PREFIXO_API}/clientes/1/agenda`],
      ['PUT /clientes/:id/agenda/:id', 'put', `${PREFIXO_API}/clientes/1/agenda/1`],
      ['DELETE /clientes/:id/agenda/:id', 'delete', `${PREFIXO_API}/clientes/1/agenda/1`],
      [
        'GET /clientes/:id/agenda/responsaveis',
        'get',
        `${PREFIXO_API}/clientes/1/agenda/responsaveis`,
      ],
    ];

    it.each(rotas)('%s responde 401 sem token', async (_nome, metodo, url) => {
      const resposta = await request(app.getHttpServer())[metodo](url).send({});
      expect(resposta.status).toBe(401);
    });

    it.each(rotas)('%s responde 403 para papel cliente', async (_nome, metodo, url) => {
      await liberarFeature(prisma, Feature.VISUALIZAR_AGENDA_CLIENTE, [Role.CLIENTE]);
      await liberarFeature(prisma, Feature.GERENCIAR_AGENDA_CLIENTE, [Role.CLIENTE]);
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

    it('só visualizar não permite criar nem listar responsáveis', async () => {
      await liberarFeature(prisma, Feature.VISUALIZAR_AGENDA_CLIENTE, PAPEIS);
      const { token } = await criarUsuarioAutenticado(app, Role.CONSULTOR);
      const { usuario: cliente } = await criarUsuarioAutenticado(app, Role.CLIENTE);
      const rota = `${PREFIXO_API}/clientes/${cliente.id}/agenda`;

      const leitura = await request(app.getHttpServer())
        .get(rota)
        .set('Authorization', `Bearer ${token}`);
      const escrita = await request(app.getHttpServer())
        .post(rota)
        .set('Authorization', `Bearer ${token}`)
        .send({ titulo: 'x', agendado_para: '2026-10-21T14:00:00.000Z' });
      const responsaveis = await request(app.getHttpServer())
        .get(`${rota}/responsaveis`)
        .set('Authorization', `Bearer ${token}`);

      expect(leitura.status).toBe(200);
      expect(escrita.status).toBe(403);
      expect(responsaveis.status).toBe(403);
    });
  });

  describe('GET /clientes/:id/agenda', () => {
    it('lista ordenado por agendado_para, ignora excluídos e outros clientes', async () => {
      const { consultor, cliente, rota } = await prepararCenario();
      const { usuario: outroCliente } = await criarUsuarioAutenticado(app, Role.CLIENTE);
      const autorId = consultor.usuario.id;
      await criarCompromisso(cliente.id, autorId, {
        titulo: 'Depois',
        agendadoPara: new Date('2026-10-25T10:00:00.000Z'),
      });
      await criarCompromisso(cliente.id, autorId, {
        titulo: 'Antes',
        agendadoPara: new Date('2026-10-20T10:00:00.000Z'),
        responsavelId: autorId,
        visivelCliente: true,
      });
      await criarCompromisso(cliente.id, autorId, { titulo: 'Excluído', deletedAt: new Date() });
      await criarCompromisso(outroCliente.id, autorId, { titulo: 'Outro cliente' });

      const resposta = await request(app.getHttpServer())
        .get(rota)
        .set('Authorization', `Bearer ${consultor.token}`);

      expect(resposta.status).toBe(200);
      expect(resposta.body.message).toBe('Agenda carregada com sucesso!');
      expect(resposta.body.data.map((c: { titulo: string }) => c.titulo)).toEqual([
        'Antes',
        'Depois',
      ]);
      expect(resposta.body.data[0]).toEqual({
        id: expect.any(Number),
        cliente_id: Number(cliente.id),
        tipo: 'nota',
        titulo: 'Antes',
        descricao: null,
        agendado_para: '2026-10-20T10:00:00.000Z',
        status: 'pendente',
        concluido_em: null,
        visivel_cliente: true,
        atrasado: expect.any(Boolean),
        autor: { id: Number(autorId), nome: consultor.usuario.nome },
        responsavel: { tipo: 'interno', id: Number(autorId), nome: consultor.usuario.nome },
        created_at: expect.any(String),
        updated_at: expect.any(String),
      });
      expect(resposta.body.data[1].responsavel).toBeNull();
      expect(resposta.body.pagination).toEqual({
        current_page: 1,
        last_page: 1,
        per_page: 20,
        total: 2,
      });
    });

    it('filtra por status, tipo, período e busca', async () => {
      const { consultor, cliente, rota } = await prepararCenario();
      const autorId = consultor.usuario.id;
      await criarCompromisso(cliente.id, autorId, {
        titulo: 'Visita técnica',
        tipo: 'visita',
        agendadoPara: new Date('2026-10-15T10:00:00.000Z'),
      });
      await criarCompromisso(cliente.id, autorId, {
        titulo: 'Visita concluída',
        tipo: 'visita',
        status: 'concluido',
        agendadoPara: new Date('2026-10-15T11:00:00.000Z'),
      });
      await criarCompromisso(cliente.id, autorId, {
        titulo: 'Visita em novembro',
        tipo: 'visita',
        agendadoPara: new Date('2026-11-15T10:00:00.000Z'),
      });
      await criarCompromisso(cliente.id, autorId, {
        titulo: 'Ligação',
        tipo: 'ligacao',
        agendadoPara: new Date('2026-10-15T12:00:00.000Z'),
      });

      const resposta = await request(app.getHttpServer())
        .get(rota)
        .query({
          status: 'pendente',
          tipo: 'visita',
          de: '2026-10-01',
          ate: '2026-10-31',
          search: 'Visita',
        })
        .set('Authorization', `Bearer ${consultor.token}`);

      expect(resposta.status).toBe(200);
      expect(resposta.body.data.map((c: { titulo: string }) => c.titulo)).toEqual([
        'Visita técnica',
      ]);
    });

    it('400 com filtro inválido', async () => {
      const { consultor, rota } = await prepararCenario();

      const resposta = await request(app.getHttpServer())
        .get(rota)
        .query({ status: 'feito', de: '01/10/2026' })
        .set('Authorization', `Bearer ${consultor.token}`);

      expect(resposta.status).toBe(400);
    });

    it('404 quando o clienteId não é cliente ativo', async () => {
      const { consultor } = await prepararCenario();

      const resposta = await request(app.getHttpServer())
        .get(`${PREFIXO_API}/clientes/${consultor.usuario.id}/agenda`)
        .set('Authorization', `Bearer ${consultor.token}`);

      expect(resposta.status).toBe(404);
      expect(resposta.body.message).toBe('Cliente não encontrado.');
    });
  });

  describe('POST /clientes/:id/agenda', () => {
    it('cria o compromisso com padrões e grava no banco', async () => {
      const { consultor, cliente, rota } = await prepararCenario();

      const resposta = await request(app.getHttpServer())
        .post(rota)
        .set('Authorization', `Bearer ${consultor.token}`)
        .send({ titulo: '  Ligar para o cliente ', agendado_para: '2026-10-21T14:00:00.000Z' });

      expect(resposta.status).toBe(201);
      expect(resposta.body.message).toBe('Compromisso criado com sucesso!');
      expect(resposta.body.data).toEqual(
        expect.objectContaining({
          cliente_id: Number(cliente.id),
          tipo: 'nota',
          titulo: 'Ligar para o cliente',
          status: 'pendente',
          visivel_cliente: false,
          autor: { id: Number(consultor.usuario.id), nome: consultor.usuario.nome },
          responsavel: null,
        }),
      );

      const salvo = await prisma.clienteCompromisso.findUniqueOrThrow({
        where: { id: BigInt(resposta.body.data.id) },
      });
      expect(salvo).toEqual(
        expect.objectContaining({
          clienteId: cliente.id,
          autorId: consultor.usuario.id,
          responsavelId: null,
          tipo: 'nota',
          titulo: 'Ligar para o cliente',
          agendadoPara: new Date('2026-10-21T14:00:00.000Z'),
          visivelCliente: false,
          deletedAt: null,
        }),
      );
    });

    it('descricao "" é gravada como null', async () => {
      const { consultor, rota } = await prepararCenario();

      const resposta = await request(app.getHttpServer())
        .post(rota)
        .set('Authorization', `Bearer ${consultor.token}`)
        .send({ titulo: 'Ligar', agendado_para: '2026-10-21T14:00:00.000Z', descricao: '' });

      expect(resposta.status).toBe(201);
      expect(resposta.body.data.descricao).toBeNull();
      const salvo = await prisma.clienteCompromisso.findUniqueOrThrow({
        where: { id: BigInt(resposta.body.data.id) },
      });
      expect(salvo.descricao).toBeNull();
    });

    it('cria com responsável interno, tipo e visível ao cliente', async () => {
      const { consultor, rota } = await prepararCenario();
      const { usuario: produtor } = await criarUsuarioAutenticado(app, Role.PRODUCAO);

      const resposta = await request(app.getHttpServer())
        .post(rota)
        .set('Authorization', `Bearer ${consultor.token}`)
        .send({
          titulo: 'Reunião',
          tipo: 'reuniao',
          descricao: 'Levar amostras',
          agendado_para: '2026-10-21T14:00:00.000Z',
          responsavel_id: Number(produtor.id),
          visivel_cliente: true,
        });

      expect(resposta.status).toBe(201);
      expect(resposta.body.data).toEqual(
        expect.objectContaining({
          tipo: 'reuniao',
          descricao: 'Levar amostras',
          visivel_cliente: true,
          responsavel: { tipo: 'interno', id: Number(produtor.id), nome: produtor.nome },
        }),
      );
    });

    it('cria com o próprio cliente ou um subordinado dele como responsável', async () => {
      const { consultor, cliente, rota } = await prepararCenario();
      const subordinado = await criarSubordinado(cliente.id);

      const doCliente = await request(app.getHttpServer())
        .post(rota)
        .set('Authorization', `Bearer ${consultor.token}`)
        .send({
          titulo: 'Visita',
          agendado_para: '2026-10-21T14:00:00.000Z',
          responsavel_id: Number(cliente.id),
        });
      const doSubordinado = await request(app.getHttpServer())
        .post(rota)
        .set('Authorization', `Bearer ${consultor.token}`)
        .send({
          titulo: 'Ligação',
          agendado_para: '2026-10-21T14:00:00.000Z',
          responsavel_subordinado_id: Number(subordinado.id),
        });

      expect(doCliente.status).toBe(201);
      expect(doCliente.body.data.responsavel).toEqual({
        tipo: 'cliente',
        id: Number(cliente.id),
        nome: cliente.nome,
      });
      expect(doSubordinado.status).toBe(201);
      expect(doSubordinado.body.data.responsavel).toEqual({
        tipo: 'subordinado',
        id: Number(subordinado.id),
        nome: 'Compras',
      });
      const salvo = await prisma.clienteCompromisso.findUniqueOrThrow({
        where: { id: BigInt(doSubordinado.body.data.id) },
      });
      expect(salvo.responsavelId).toBeNull();
      expect(salvo.responsavelSubordinadoId).toBe(subordinado.id);
    });

    it('400 com subordinado de outro cliente ou inativo, sem gravar', async () => {
      const { consultor, cliente, rota } = await prepararCenario();
      const { usuario: outroCliente } = await criarUsuarioAutenticado(app, Role.CLIENTE);
      const deOutro = await criarSubordinado(outroCliente.id);
      const inativo = await criarSubordinado(cliente.id, { ativo: false });

      for (const subordinado of [deOutro, inativo]) {
        const resposta = await request(app.getHttpServer())
          .post(rota)
          .set('Authorization', `Bearer ${consultor.token}`)
          .send({
            titulo: 'Reunião',
            agendado_para: '2026-10-21T14:00:00.000Z',
            responsavel_subordinado_id: Number(subordinado.id),
          });
        expect(resposta.status).toBe(400);
      }
      expect(await prisma.clienteCompromisso.count()).toBe(0);
    });

    it('400 com os dois responsáveis informados, sem gravar', async () => {
      const { consultor, cliente, rota } = await prepararCenario();
      const subordinado = await criarSubordinado(cliente.id);

      const resposta = await request(app.getHttpServer())
        .post(rota)
        .set('Authorization', `Bearer ${consultor.token}`)
        .send({
          titulo: 'Reunião',
          agendado_para: '2026-10-21T14:00:00.000Z',
          responsavel_id: Number(consultor.usuario.id),
          responsavel_subordinado_id: Number(subordinado.id),
        });

      expect(resposta.status).toBe(400);
      expect(resposta.body.message).toBe(
        'Informe só um responsável: responsavel_id ou responsavel_subordinado_id.',
      );
      expect(await prisma.clienteCompromisso.count()).toBe(0);
    });

    it('400 quando o responsável não é interno ativo nem o cliente, sem gravar', async () => {
      const { consultor, rota } = await prepararCenario();
      const { usuario: outroCliente } = await criarUsuarioAutenticado(app, Role.CLIENTE);

      const resposta = await request(app.getHttpServer())
        .post(rota)
        .set('Authorization', `Bearer ${consultor.token}`)
        .send({
          titulo: 'Reunião',
          agendado_para: '2026-10-21T14:00:00.000Z',
          responsavel_id: Number(outroCliente.id),
        });

      expect(resposta.status).toBe(400);
      expect(resposta.body.message).toBe(
        'Responsável inválido: informe um usuário interno ativo, o cliente ou um subordinado ativo dele.',
      );
      expect(await prisma.clienteCompromisso.count()).toBe(0);
    });

    it.each([
      ['sem título', { agendado_para: '2026-10-21T14:00:00.000Z' }],
      ['sem data', { titulo: 'x' }],
      ['data inválida', { titulo: 'x', agendado_para: 'amanhã' }],
      ['tipo inválido', { titulo: 'x', agendado_para: '2026-10-21T14:00:00.000Z', tipo: 'almoco' }],
      ['título longo', { titulo: 'x'.repeat(192), agendado_para: '2026-10-21T14:00:00.000Z' }],
    ])('400 com DTO inválido (%s)', async (_caso, corpo) => {
      const { consultor, rota } = await prepararCenario();

      const resposta = await request(app.getHttpServer())
        .post(rota)
        .set('Authorization', `Bearer ${consultor.token}`)
        .send(corpo);

      expect(resposta.status).toBe(400);
      expect(await prisma.clienteCompromisso.count()).toBe(0);
    });

    it('404 quando o clienteId não é cliente ativo', async () => {
      const { consultor } = await prepararCenario();

      const resposta = await request(app.getHttpServer())
        .post(`${PREFIXO_API}/clientes/999999/agenda`)
        .set('Authorization', `Bearer ${consultor.token}`)
        .send({ titulo: 'x', agendado_para: '2026-10-21T14:00:00.000Z' });

      expect(resposta.status).toBe(404);
    });
  });

  describe('PUT /clientes/:id/agenda/:id', () => {
    it('conclui o compromisso gravando concluido_em e depois reabre limpando', async () => {
      const { consultor, cliente, rota } = await prepararCenario();
      const compromisso = await criarCompromisso(cliente.id, consultor.usuario.id);

      const concluir = await request(app.getHttpServer())
        .put(`${rota}/${compromisso.id}`)
        .set('Authorization', `Bearer ${consultor.token}`)
        .send({ status: 'concluido', titulo: 'Feito' });

      expect(concluir.status).toBe(200);
      expect(concluir.body.message).toBe('Compromisso atualizado com sucesso!');
      expect(concluir.body.data).toEqual(
        expect.objectContaining({
          status: 'concluido',
          titulo: 'Feito',
          concluido_em: expect.any(String),
          atrasado: false,
        }),
      );
      const concluido = await prisma.clienteCompromisso.findUniqueOrThrow({
        where: { id: compromisso.id },
      });
      expect(concluido.concluidoEm).toBeInstanceOf(Date);

      const reabrir = await request(app.getHttpServer())
        .put(`${rota}/${compromisso.id}`)
        .set('Authorization', `Bearer ${consultor.token}`)
        .send({ status: 'pendente' });

      expect(reabrir.status).toBe(200);
      const reaberto = await prisma.clienteCompromisso.findUniqueOrThrow({
        where: { id: compromisso.id },
      });
      expect(reaberto).toEqual(expect.objectContaining({ status: 'pendente', concluidoEm: null }));
    });

    it('responsavel_id null remove o responsável', async () => {
      const { consultor, cliente, rota } = await prepararCenario();
      const compromisso = await criarCompromisso(cliente.id, consultor.usuario.id, {
        responsavelId: consultor.usuario.id,
      });

      const resposta = await request(app.getHttpServer())
        .put(`${rota}/${compromisso.id}`)
        .set('Authorization', `Bearer ${consultor.token}`)
        .send({ responsavel_id: null });

      expect(resposta.status).toBe(200);
      expect(resposta.body.data.responsavel).toBeNull();
      const salvo = await prisma.clienteCompromisso.findUniqueOrThrow({
        where: { id: compromisso.id },
      });
      expect(salvo.responsavelId).toBeNull();
    });

    it('trocar para subordinado limpa responsavel_id', async () => {
      const { consultor, cliente, rota } = await prepararCenario();
      const subordinado = await criarSubordinado(cliente.id);
      const compromisso = await criarCompromisso(cliente.id, consultor.usuario.id, {
        responsavelId: consultor.usuario.id,
      });

      const resposta = await request(app.getHttpServer())
        .put(`${rota}/${compromisso.id}`)
        .set('Authorization', `Bearer ${consultor.token}`)
        .send({ responsavel_subordinado_id: Number(subordinado.id) });

      expect(resposta.status).toBe(200);
      expect(resposta.body.data.responsavel).toEqual({
        tipo: 'subordinado',
        id: Number(subordinado.id),
        nome: 'Compras',
      });
      const salvo = await prisma.clienteCompromisso.findUniqueOrThrow({
        where: { id: compromisso.id },
      });
      expect(salvo.responsavelId).toBeNull();
      expect(salvo.responsavelSubordinadoId).toBe(subordinado.id);
    });

    it.each([
      ['""', ''],
      ['null', null],
    ])('descricao %s limpa a descrição (grava null)', async (_caso, descricao) => {
      const { consultor, cliente, rota } = await prepararCenario();
      const compromisso = await prisma.clienteCompromisso.create({
        data: {
          clienteId: cliente.id,
          autorId: consultor.usuario.id,
          titulo: 'Com descrição',
          descricao: 'Levar amostras',
          agendadoPara: new Date('2026-10-21T14:00:00.000Z'),
        },
      });

      const resposta = await request(app.getHttpServer())
        .put(`${rota}/${compromisso.id}`)
        .set('Authorization', `Bearer ${consultor.token}`)
        .send({ descricao });

      expect(resposta.status).toBe(200);
      expect(resposta.body.data.descricao).toBeNull();
      const salvo = await prisma.clienteCompromisso.findUniqueOrThrow({
        where: { id: compromisso.id },
      });
      expect(salvo.descricao).toBeNull();
    });

    it('400 com DTO inválido', async () => {
      const { consultor, cliente, rota } = await prepararCenario();
      const compromisso = await criarCompromisso(cliente.id, consultor.usuario.id);

      const resposta = await request(app.getHttpServer())
        .put(`${rota}/${compromisso.id}`)
        .set('Authorization', `Bearer ${consultor.token}`)
        .send({ status: 'feito', titulo: '' });

      expect(resposta.status).toBe(400);
    });

    it('400 com agendado_para null, sem alterar o banco', async () => {
      const { consultor, cliente, rota } = await prepararCenario();
      const compromisso = await criarCompromisso(cliente.id, consultor.usuario.id);

      const resposta = await request(app.getHttpServer())
        .put(`${rota}/${compromisso.id}`)
        .set('Authorization', `Bearer ${consultor.token}`)
        .send({ agendado_para: null });

      expect(resposta.status).toBe(400);
      const salvo = await prisma.clienteCompromisso.findUniqueOrThrow({
        where: { id: compromisso.id },
      });
      expect(salvo.agendadoPara).toEqual(compromisso.agendadoPara);
    });

    it('400 quando o novo responsável não é interno ativo nem o cliente', async () => {
      const { consultor, cliente, rota } = await prepararCenario();
      const { usuario: outroCliente } = await criarUsuarioAutenticado(app, Role.CLIENTE);
      const compromisso = await criarCompromisso(cliente.id, consultor.usuario.id);

      const resposta = await request(app.getHttpServer())
        .put(`${rota}/${compromisso.id}`)
        .set('Authorization', `Bearer ${consultor.token}`)
        .send({ responsavel_id: Number(outroCliente.id) });

      expect(resposta.status).toBe(400);
    });

    it('404 para compromisso de outro cliente ou excluído', async () => {
      const { consultor, cliente, rota } = await prepararCenario();
      const { usuario: outroCliente } = await criarUsuarioAutenticado(app, Role.CLIENTE);
      const deOutro = await criarCompromisso(outroCliente.id, consultor.usuario.id);
      const excluido = await criarCompromisso(cliente.id, consultor.usuario.id, {
        deletedAt: new Date(),
      });

      for (const id of [deOutro.id, excluido.id]) {
        const resposta = await request(app.getHttpServer())
          .put(`${rota}/${id}`)
          .set('Authorization', `Bearer ${consultor.token}`)
          .send({ titulo: 'x' });

        expect(resposta.status).toBe(404);
        expect(resposta.body.message).toBe('Compromisso não encontrado.');
      }
    });
  });

  describe('DELETE /clientes/:id/agenda/:id', () => {
    it('exclui logicamente', async () => {
      const { consultor, cliente, rota } = await prepararCenario();
      const compromisso = await criarCompromisso(cliente.id, consultor.usuario.id);

      const resposta = await request(app.getHttpServer())
        .delete(`${rota}/${compromisso.id}`)
        .set('Authorization', `Bearer ${consultor.token}`);

      expect(resposta.status).toBe(200);
      expect(resposta.body).toEqual(
        expect.objectContaining({ message: 'Compromisso excluído com sucesso!', data: null }),
      );
      const salvo = await prisma.clienteCompromisso.findUniqueOrThrow({
        where: { id: compromisso.id },
      });
      expect(salvo.deletedAt).toBeInstanceOf(Date);
    });

    it('400 com id inválido', async () => {
      const { consultor, rota } = await prepararCenario();

      const resposta = await request(app.getHttpServer())
        .delete(`${rota}/abc`)
        .set('Authorization', `Bearer ${consultor.token}`);

      expect(resposta.status).toBe(400);
    });

    it('404 quando já foi excluído', async () => {
      const { consultor, cliente, rota } = await prepararCenario();
      const compromisso = await criarCompromisso(cliente.id, consultor.usuario.id, {
        deletedAt: new Date(),
      });

      const resposta = await request(app.getHttpServer())
        .delete(`${rota}/${compromisso.id}`)
        .set('Authorization', `Bearer ${consultor.token}`);

      expect(resposta.status).toBe(404);
    });
  });

  describe('GET /clientes/:id/agenda/responsaveis', () => {
    it('lista equipe, o cliente e os subordinados ativos, paginado', async () => {
      const { consultor, cliente, rota } = await prepararCenario();
      const { usuario: recepcao } = await criarUsuarioAutenticado(app, Role.RECEPCAO);
      const { usuario: inativo } = await criarUsuarioAutenticado(app, Role.ADMIN);
      await prisma.user.update({ where: { id: inativo.id }, data: { ativo: false } });
      const { usuario: outroCliente } = await criarUsuarioAutenticado(app, Role.CLIENTE);
      const subordinado = await criarSubordinado(cliente.id);
      await criarSubordinado(cliente.id, { ativo: false });
      await criarSubordinado(outroCliente.id);

      const todos = await request(app.getHttpServer())
        .get(`${rota}/responsaveis`)
        .set('Authorization', `Bearer ${consultor.token}`);

      expect(todos.status).toBe(200);
      expect(todos.body.message).toBe('Responsáveis carregados com sucesso!');
      const chaves = todos.body.data.map((r: { tipo: string; id: number }) => `${r.tipo}:${r.id}`);
      expect(chaves.slice(0, 2).sort()).toEqual(
        [`interno:${consultor.usuario.id}`, `interno:${recepcao.id}`].sort(),
      );
      expect(chaves.slice(2)).toEqual([`cliente:${cliente.id}`, `subordinado:${subordinado.id}`]);
      expect(todos.body.data[3]).toEqual({
        tipo: 'subordinado',
        id: Number(subordinado.id),
        nome: 'Compras',
        email: subordinado.email,
        documento: '12345678900',
      });
      expect(todos.body.pagination).toEqual({
        current_page: 1,
        last_page: 1,
        per_page: 20,
        total: 4,
      });

      const pagina2 = await request(app.getHttpServer())
        .get(`${rota}/responsaveis`)
        .query({ page: 2, per_page: 3 })
        .set('Authorization', `Bearer ${consultor.token}`);

      expect(pagina2.body.data.map((r: { tipo: string }) => r.tipo)).toEqual(['subordinado']);
      expect(pagina2.body.pagination).toEqual({
        current_page: 2,
        last_page: 2,
        per_page: 3,
        total: 4,
      });
    });

    it('busca por nome, e-mail e documento (com ou sem pontuação)', async () => {
      const { consultor, cliente, rota } = await prepararCenario();
      const { usuario: recepcao } = await criarUsuarioAutenticado(app, Role.RECEPCAO);
      const subordinado = await criarSubordinado(cliente.id);

      async function buscar(search: string) {
        const resposta = await request(app.getHttpServer())
          .get(`${rota}/responsaveis`)
          .query({ search })
          .set('Authorization', `Bearer ${consultor.token}`);
        return resposta.body.data.map((r: { tipo: string; id: number }) => `${r.tipo}:${r.id}`);
      }

      expect(await buscar(recepcao.email)).toEqual([`interno:${recepcao.id}`]);
      expect(await buscar('Compras')).toEqual([`subordinado:${subordinado.id}`]);
      expect(await buscar('123.456.789-00')).toEqual([`subordinado:${subordinado.id}`]);
    });

    it('400 com busca acima de 100 caracteres', async () => {
      const { consultor, rota } = await prepararCenario();

      const resposta = await request(app.getHttpServer())
        .get(`${rota}/responsaveis`)
        .query({ search: 'x'.repeat(101) })
        .set('Authorization', `Bearer ${consultor.token}`);

      expect(resposta.status).toBe(400);
    });

    it('404 quando o clienteId não é cliente ativo', async () => {
      const { consultor } = await prepararCenario();

      const resposta = await request(app.getHttpServer())
        .get(`${PREFIXO_API}/clientes/${consultor.usuario.id}/agenda/responsaveis`)
        .set('Authorization', `Bearer ${consultor.token}`);

      expect(resposta.status).toBe(404);
    });
  });
});
