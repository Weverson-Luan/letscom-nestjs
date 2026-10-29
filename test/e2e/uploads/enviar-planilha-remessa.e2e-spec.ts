/**
 * IMPORTS
 */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';

// shared / prisma (conexão com o banco)
import { PrismaService } from 'src/shared/prisma/prisma.service';

// shared / auth (features e mensagens de permissão)
import { MENSAGEM_SEM_PERMISSAO } from 'src/shared/auth/features';

// shared / roles
import { Role } from 'src/shared/constants/roles';

// shared / storage
import { StorageService } from 'src/shared/storage/storage.service';

// helpers e2e (app, banco e autenticação)
import { criarAppE2e } from '../helpers/criar-app-e2e';
import { criarUsuarioAutenticado } from '../helpers/criar-usuario-autenticado';
import { limparBanco } from '../helpers/limpar-banco';

// fixtures do módulo (rota, autenticação, remessa e arquivos)
import {
  autenticarPapelSemAcesso,
  autenticarProducao,
  criarRemessa,
  removerArquivosGravados,
  ROTA_REMESSAS,
} from './uploads.fixtures';

describe('POST /remessas/:remessaId/upload-planilha (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const remessasComArquivos: bigint[] = [];

  beforeAll(async () => {
    app = await criarAppE2e();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await limparBanco(prisma);
  });

  afterEach(async () => {
    for (const remessaId of remessasComArquivos.splice(0)) {
      await removerArquivosGravados(app, 'planilhas', remessaId);
    }
  });

  afterAll(async () => {
    await app?.close();
  });

  const rota = (remessaId: bigint | number) => `${ROTA_REMESSAS}/${remessaId}/upload-planilha`;
  const planilha = Buffer.from('nome;matricula\nAna;1\n');

  it('responde 401 sem token', async () => {
    const resposta = await request(app.getHttpServer()).post(rota(1));

    expect(resposta.status).toBe(401);
  });

  it('responde 403 para papel sem acesso', async () => {
    const { token } = await autenticarPapelSemAcesso(app);

    const resposta = await request(app.getHttpServer())
      .post(rota(1))
      .set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(403);
  });

  it('responde 403 sem a feature liberada', async () => {
    const { token } = await criarUsuarioAutenticado(app, Role.PRODUCAO);

    const resposta = await request(app.getHttpServer())
      .post(rota(1))
      .set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(403);
    expect(resposta.body.message).toBe(MENSAGEM_SEM_PERMISSAO);
  });

  it('responde 400 quando o file não é enviado', async () => {
    const { token } = await autenticarProducao(app);
    const remessa = await criarRemessa(app);

    const resposta = await request(app.getHttpServer())
      .post(rota(remessa.id))
      .set('Authorization', `Bearer ${token}`)
      .field('tipo', 'solicitacao');

    expect(resposta.status).toBe(400);
    expect(resposta.body.message).toBe('O campo file é obrigatório.');
  });

  it('responde 404 quando a remessa não existe', async () => {
    const { token } = await autenticarProducao(app);

    const resposta = await request(app.getHttpServer())
      .post(rota(999999))
      .set('Authorization', `Bearer ${token}`)
      .attach('file', planilha, 'dados.csv');

    expect(resposta.status).toBe(404);
    expect(resposta.body.message).toBe('Remessa não encontrada.');
  });

  it('grava a planilha (com a pasta raiz) usando a extensão como tipo e registra no banco', async () => {
    const { token } = await autenticarProducao(app);
    const remessa = await criarRemessa(app);
    remessasComArquivos.push(remessa.id);

    const resposta = await request(app.getHttpServer())
      .post(rota(remessa.id))
      .set('Authorization', `Bearer ${token}`)
      .attach('file', planilha, 'Dados.CSV');

    expect(resposta.status).toBe(201);
    expect(resposta.body.message).toBe('Planilha enviada com sucesso!');
    const pastaDaRemessa = app
      .get(StorageService)
      .montarCaminho(`remessas/planilhas/${remessa.id}`);
    expect(resposta.body.data).toEqual({
      id: expect.any(Number),
      remessa_id: Number(remessa.id),
      cliente_id: Number(remessa.clienteId),
      file_path: expect.stringMatching(new RegExp(`^${pastaDaRemessa}/[0-9a-f-]{36}\\.csv$`)),
      tipo: 'csv',
      created_at: expect.any(String),
    });

    const persistida = await prisma.remessaPlanilha.findUniqueOrThrow({
      where: { id: BigInt(resposta.body.data.id) },
    });
    expect(persistida.filePath).toBe(resposta.body.data.file_path);
    const gravado = await app.get(StorageService).download(persistida.filePath);
    expect(gravado?.toString()).toBe(planilha.toString());
  });

  it('usa o tipo informado no lugar da extensão', async () => {
    const { token } = await autenticarProducao(app);
    const remessa = await criarRemessa(app);
    remessasComArquivos.push(remessa.id);

    const resposta = await request(app.getHttpServer())
      .post(rota(remessa.id))
      .set('Authorization', `Bearer ${token}`)
      .field('tipo', 'solicitacao')
      .attach('file', planilha, 'dados.xlsx');

    expect(resposta.status).toBe(201);
    expect(resposta.body.data.tipo).toBe('solicitacao');
  });
});
