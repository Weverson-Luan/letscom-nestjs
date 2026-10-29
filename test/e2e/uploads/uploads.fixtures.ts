/**
 * IMPORTS
 */
import { INestApplication } from '@nestjs/common';
import AdmZip from 'adm-zip';

// shared / prisma (conexão com o banco)
import { PrismaService } from 'src/shared/prisma/prisma.service';

// shared / auth (features e mensagens de permissão)
import { Feature } from 'src/shared/auth/features';

// shared / roles
import { Role } from 'src/shared/constants/roles';

// shared / storage
import { StorageService } from 'src/shared/storage/storage.service';

// helpers e2e (app, banco e autenticação)
import { PREFIXO_API } from '../helpers/criar-app-e2e';
import { criarUsuarioAutenticado } from '../helpers/criar-usuario-autenticado';
import { liberarFeature } from '../helpers/liberar-feature';

/** Dados e atalhos compartilhados pelos e2e de uploads (um arquivo por endpoint). */

export const ROTA_REMESSAS = `${PREFIXO_API}/remessas`;

/** Libera finalizar_tarefa_remessas para os papéis informados. */
function liberarFeatureDeUpload(app: INestApplication, papeis: string[]) {
  return liberarFeature(app.get(PrismaService), Feature.FINALIZAR_TAREFA_REMESSAS, papeis);
}

/** Produção autenticada com a feature de upload liberada. */
export async function autenticarProducao(app: INestApplication) {
  await liberarFeatureDeUpload(app, [Role.ADMIN, Role.PRODUCAO, Role.CONSULTOR]);
  return criarUsuarioAutenticado(app, Role.PRODUCAO);
}

/** Recepção com a feature liberada, mas fora do @Roles das rotas de upload. */
export async function autenticarPapelSemAcesso(app: INestApplication) {
  await liberarFeatureDeUpload(app, [Role.RECEPCAO]);
  return criarUsuarioAutenticado(app, Role.RECEPCAO);
}

/** Remessa mínima (cliente, tecnologia, produto e modelo técnico) para receber os arquivos. */
export async function criarRemessa(app: INestApplication) {
  const prisma = app.get(PrismaService);
  const { usuario: cliente } = await criarUsuarioAutenticado(app, Role.CLIENTE);
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

  return prisma.remessa.create({
    data: {
      clienteId: cliente.id,
      modeloTecnicoId: modelo.id,
      tecnologiaId: tecnologia.id,
      totalSolicitacoes: 10,
      numeroRemessa: BigInt(52647),
      status: 'em_producao',
    },
  });
}

/** ZIP em memória com os arquivos informados ({ caminho dentro do zip: conteúdo }). */
export function montarZip(arquivos: Record<string, string>): Buffer {
  const zip = new AdmZip();
  for (const [caminho, conteudo] of Object.entries(arquivos)) {
    zip.addFile(caminho, Buffer.from(conteudo));
  }
  return zip.toBuffer();
}

/** Apaga do disco local de teste o que o upload gravou em `remessas/<pasta>/<remessaId>`. */
export function removerArquivosGravados(
  app: INestApplication,
  pasta: 'fotos' | 'planilhas',
  remessaId: bigint,
) {
  const storage = app.get(StorageService);
  return storage.deleteDirectory(storage.montarCaminho(`remessas/${pasta}/${remessaId}`));
}
