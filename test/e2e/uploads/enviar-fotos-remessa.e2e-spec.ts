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
  montarZip,
  removerArquivosGravados,
  ROTA_REMESSAS,
} from './uploads.fixtures';

describe('POST /remessas/:remessaId/upload-fotos (e2e)', () => {
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
      await removerArquivosGravados(app, 'fotos', remessaId);
    }
  });

  afterAll(async () => {
    await app?.close();
  });

  const rota = (remessaId: bigint | number) => `${ROTA_REMESSAS}/${remessaId}/upload-fotos`;

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

  it('responde 400 quando o zip_file não é enviado', async () => {
    const { token } = await autenticarProducao(app);
    const remessa = await criarRemessa(app);

    const resposta = await request(app.getHttpServer())
      .post(rota(remessa.id))
      .set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(400);
    expect(resposta.body.message).toBe('O campo zip_file é obrigatório.');
  });

  it('responde 404 quando a remessa não existe', async () => {
    const { token } = await autenticarProducao(app);

    const resposta = await request(app.getHttpServer())
      .post(rota(999999))
      .set('Authorization', `Bearer ${token}`)
      .attach('zip_file', montarZip({ '1.jpg': 'foto' }), 'fotos.zip');

    expect(resposta.status).toBe(404);
    expect(resposta.body.message).toBe('Remessa não encontrada.');
  });

  it('extrai as fotos do ZIP, ignora metadados do macOS, grava no storage (com a pasta raiz) e registra cada foto', async () => {
    const { token } = await autenticarProducao(app);
    const remessa = await criarRemessa(app);
    remessasComArquivos.push(remessa.id);

    const resposta = await request(app.getHttpServer())
      .post(rota(remessa.id))
      .set('Authorization', `Bearer ${token}`)
      .attach(
        'zip_file',
        montarZip({ '123.jpg': 'foto-a', '456.jpg': 'foto-b', '__MACOSX/._123.jpg': 'lixo' }),
        'fotos.zip',
      );

    expect(resposta.status).toBe(201);
    expect(resposta.body.code).toBe(200);
    expect(resposta.body.message).toBe('Fotos extraídas e salvas com sucesso.');
    const storage = app.get(StorageService);
    const caminhoFoto = (nome: string) =>
      storage.montarCaminho(`remessas/fotos/${remessa.id}/${nome}`);
    expect([...resposta.body.files].sort()).toEqual([
      caminhoFoto('123.jpg'),
      caminhoFoto('456.jpg'),
    ]);

    const fotos = await prisma.remessaFoto.findMany({ where: { remessaId: remessa.id } });
    expect(fotos.map((foto) => foto.filePath).sort()).toEqual([...resposta.body.files].sort());
    expect(fotos.every((foto) => foto.clienteId === remessa.clienteId)).toBe(true);
    const gravado = await storage.download(caminhoFoto('123.jpg'));
    expect(gravado?.toString()).toBe('foto-a');
  });
});
