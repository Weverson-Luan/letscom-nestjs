import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Feature, MENSAGEM_SEM_PERMISSAO } from 'src/shared/auth/features';
import { Role } from 'src/shared/constants/roles';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { criarAppE2e, PREFIXO_API } from '../helpers/criar-app-e2e';
import { buscarOuCriarPapel, criarUsuarioAutenticado } from '../helpers/criar-usuario-autenticado';
import { liberarFeature } from '../helpers/liberar-feature';
import { limparBanco } from '../helpers/limpar-banco';

const ROTA = `${PREFIXO_API}/users/cliente-completo`;

function montarPayload() {
  return {
    cliente: {
      nome: 'Empresa XYZ',
      email: 'contato@empresa.com',
      ativo: true,
      documento: '12345678000199',
      telefone: '11988887777',
      tipo_pessoa: 'J',
      senha: 'senha123',
    },
    endereco: {
      logradouro: 'Rua das Flores',
      numero: '100',
      complemento: 'Sala 2',
      bairro: 'Centro',
      cidade: 'São Paulo',
      estado: 'SP',
      cep: '01001000',
      tipo_endereco: 'entrega',
      nome_responsavel: 'João Responsável',
      email: 'responsavel@empresa.com',
      setor: 'RH',
      telefone: '11977776666',
    },
    usuarios_cliente: [
      {
        nome: 'Subordinado',
        email: 'sub@empresa.com',
        senha: 'senha123',
        documento: '12345678901',
        ativo: true,
      },
    ],
  };
}

describe('POST /users/cliente-completo (e2e)', () => {
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

  /** Admin autenticado com a feature criar_cliente liberada (cenário permitido). */
  async function autenticarAdmin() {
    await liberarFeature(prisma, Feature.CRIAR_CLIENTE, [
      Role.ADMIN,
      Role.PRODUCAO,
      Role.CONSULTOR,
    ]);
    return criarUsuarioAutenticado(app, Role.ADMIN);
  }

  it('responde 401 sem token', async () => {
    const resposta = await request(app.getHttpServer()).post(ROTA).send(montarPayload());

    expect(resposta.status).toBe(401);
  });

  it('responde 403 quando o papel não é admin, producao nem consultor', async () => {
    await liberarFeature(prisma, Feature.CRIAR_CLIENTE, [Role.CLIENTE]);
    const { token } = await criarUsuarioAutenticado(app, Role.CLIENTE);

    const resposta = await request(app.getHttpServer())
      .post(ROTA)
      .set('Authorization', `Bearer ${token}`)
      .send(montarPayload());

    expect(resposta.status).toBe(403);
    expect(await prisma.user.count({ where: { email: 'contato@empresa.com' } })).toBe(0);
  });

  it('responde 403 quando a feature criar_cliente não está liberada para o papel', async () => {
    const { token } = await criarUsuarioAutenticado(app, Role.ADMIN);

    const resposta = await request(app.getHttpServer())
      .post(ROTA)
      .set('Authorization', `Bearer ${token}`)
      .send(montarPayload());

    expect(resposta.status).toBe(403);
    expect(resposta.body.message).toBe(MENSAGEM_SEM_PERMISSAO);
  });

  it('responde 400 com os erros de validação quando o payload é inválido', async () => {
    const { token } = await autenticarAdmin();
    const payload = montarPayload();
    payload.cliente.email = 'email-invalido';
    payload.cliente.senha = '123';

    const resposta = await request(app.getHttpServer())
      .post(ROTA)
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    expect(resposta.status).toBe(400);
    expect(resposta.body).toMatchObject({
      code: 400,
      status: 'error',
      message: 'Dados inválidos.',
    });
    expect(resposta.body.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('cliente.email'),
        expect.stringContaining('cliente.senha'),
      ]),
    );
    expect(await prisma.user.count({ where: { email: 'email-invalido' } })).toBe(0);
  });

  it('responde 201 e cria cliente, endereço, subordinados, papéis, consultor e tipo de entrega', async () => {
    const { token } = await autenticarAdmin();
    const { usuario: consultor } = await criarUsuarioAutenticado(app, Role.CONSULTOR);
    const papelCliente = await buscarOuCriarPapel(prisma, Role.CLIENTE);
    const papelSubordinado = await buscarOuCriarPapel(prisma, Role.SUBORDINADO);
    const tipoEntrega = await prisma.tipoEntrega.create({ data: {} });

    const payload = {
      ...montarPayload(),
      cliente: {
        ...montarPayload().cliente,
        roles: Number(papelCliente.id),
        consultor_id: Number(consultor.id),
        tipo_entrega_id: Number(tipoEntrega.id),
      },
    };
    payload.usuarios_cliente[0] = {
      ...payload.usuarios_cliente[0],
      role_id: Number(papelSubordinado.id),
    } as (typeof payload.usuarios_cliente)[0];

    const resposta = await request(app.getHttpServer())
      .post(ROTA)
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    expect(resposta.status).toBe(201);
    expect(resposta.body).toMatchObject({
      status: 201,
      message: 'Cliente, endereço e usuários criados com sucesso!',
    });

    const { user, endereco, usuarios_cliente } = resposta.body.data;
    expect(user).toMatchObject({
      id: expect.any(Number),
      nome: 'Empresa XYZ',
      email: 'contato@empresa.com',
      documento: '12345678000199',
      tipoPessoa: 'J',
      ativo: true,
    });
    expect(user).not.toHaveProperty('senha');
    expect(endereco).toMatchObject({ userId: user.id, cep: '01001-000', tipoEndereco: 'entrega' });
    expect(usuarios_cliente).toHaveLength(2);
    expect(usuarios_cliente.map((u: { email: string }) => u.email)).toEqual([
      'sub@empresa.com',
      `comercial${user.id}@letscom.com.br`,
    ]);
    usuarios_cliente.forEach((u: object) => expect(u).not.toHaveProperty('senha'));

    // efeito persistido
    const clienteId = BigInt(user.id);
    const clienteSalvo = await prisma.user.findUniqueOrThrow({ where: { id: clienteId } });
    expect(clienteSalvo.senha).not.toBe('senha123');
    expect(clienteSalvo.senha).toMatch(/^\$2[aby]\$/);

    expect(await prisma.endereco.count({ where: { userId: clienteId } })).toBe(1);

    const subordinados = await prisma.userCliente.findMany({
      where: { clienteId },
      orderBy: { id: 'asc' },
    });
    expect(subordinados.map((s) => s.nome)).toEqual(['Subordinado', 'Letscom Comercial']);

    const papeisCliente = await prisma.$queryRaw<{ role_id: bigint }[]>`
      SELECT role_id FROM role_user WHERE user_id = ${clienteId} AND ativo = 1
    `;
    expect(papeisCliente.map((p) => p.role_id)).toEqual([papelCliente.id]);

    const papeisSubordinado = await prisma.$queryRaw<{ role_id: bigint }[]>`
      SELECT role_id FROM role_user WHERE client_sub_id = ${subordinados[0].id} AND ativo = 1
    `;
    expect(papeisSubordinado.map((p) => p.role_id)).toEqual([papelSubordinado.id]);

    expect(
      await prisma.clienteConsultor.count({ where: { clienteId, consultorId: consultor.id } }),
    ).toBe(1);
    expect(
      await prisma.tipoEntregaUser.count({ where: { clienteId, tipoEntregaId: tipoEntrega.id } }),
    ).toBe(1);
  });

  it('cria só o subordinado padrão "Letscom Comercial" quando usuarios_cliente não é enviado', async () => {
    const { token } = await autenticarAdmin();
    const payload: Partial<ReturnType<typeof montarPayload>> = montarPayload();
    delete payload.usuarios_cliente;

    const resposta = await request(app.getHttpServer())
      .post(ROTA)
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    expect(resposta.status).toBe(201);
    const subordinados = await prisma.userCliente.findMany({
      where: { clienteId: BigInt(resposta.body.data.user.id) },
    });
    expect(subordinados).toHaveLength(1);
    expect(subordinados[0]).toMatchObject({ nome: 'Letscom Comercial', ativo: true });
  });

  it('responde 400 quando tipo_endereco não é um valor do enum TipoEndereco', async () => {
    const { token } = await autenticarAdmin();
    const payload = montarPayload();
    payload.endereco.tipo_endereco = 'comercial';

    const resposta = await request(app.getHttpServer())
      .post(ROTA)
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    expect(resposta.status).toBe(400);
    expect(resposta.body.errors).toEqual(
      expect.arrayContaining([expect.stringContaining('endereco.tipo_endereco')]),
    );
    expect(await prisma.user.count({ where: { email: 'contato@empresa.com' } })).toBe(0);
  });

  it('responde 409 quando já existe um cliente com o mesmo e-mail', async () => {
    const { token } = await autenticarAdmin();
    await request(app.getHttpServer())
      .post(ROTA)
      .set('Authorization', `Bearer ${token}`)
      .send(montarPayload())
      .expect(201);

    // só o e-mail repete: documento, telefone e subordinado são outros
    const payload = montarPayload();
    payload.cliente.documento = '98765432000111';
    payload.cliente.telefone = '11911112222';
    payload.usuarios_cliente[0] = {
      ...payload.usuarios_cliente[0],
      email: 'outro-sub@empresa.com',
      documento: '10987654321',
    };

    const resposta = await request(app.getHttpServer())
      .post(ROTA)
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    expect(resposta.status).toBe(409);
    expect(resposta.body).toMatchObject({
      code: 409,
      status: 'error',
      message: 'Já existe um cliente com este e-mail.',
    });
    expect(await prisma.user.count({ where: { email: 'contato@empresa.com' } })).toBe(1);
  });

  it('responde 409 e desfaz tudo (transação) quando um subordinado repete e-mail no meio da criação', async () => {
    const { token } = await autenticarAdmin();
    const payload = montarPayload();
    // segundo subordinado com o mesmo e-mail: users_cliente.email é único e o insert falha
    // depois de cliente, endereço e primeiro subordinado já criados
    payload.usuarios_cliente.push({ ...payload.usuarios_cliente[0], documento: '10987654321' });

    const resposta = await request(app.getHttpServer())
      .post(ROTA)
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    expect(resposta.status).toBe(409);
    expect(resposta.body.message).toBe('Já existe um usuário do cliente com este e-mail.');
    expect(await prisma.user.count({ where: { email: 'contato@empresa.com' } })).toBe(0);
    expect(await prisma.endereco.count()).toBe(0);
    expect(await prisma.userCliente.count()).toBe(0);
  });
});
