/**
 * IMPORTS
 */
import { INestApplication } from '@nestjs/common';

// shared / prisma (conexão com o banco)
import { PrismaService } from 'src/shared/prisma/prisma.service';

// shared / auth (features e mensagens de permissão)
import { Feature } from 'src/shared/auth/features';

// shared / roles
import { Role } from 'src/shared/constants/roles';

// helpers e2e (app, banco e autenticação)
import { PREFIXO_API } from '../helpers/criar-app-e2e';
import { criarUsuarioAutenticado } from '../helpers/criar-usuario-autenticado';
import { liberarFeature } from '../helpers/liberar-feature';

/** Dados e atalhos compartilhados pelos e2e de usuarios-cliente (um arquivo por endpoint). */

export const ROTA_USUARIOS_CLIENTE = `${PREFIXO_API}/usuarios-cliente`;

export const FEATURES_USUARIO_CLIENTE = [
  Feature.VISUALIZAR_USUARIO_CLIENTE,
  Feature.CRIAR_USUARIO_CLIENTE,
  Feature.EDITAR_USUARIOS_CLIENTE,
  Feature.INATIVAR_USUARIO_CLIENTE,
];

let sequencia = 0;

/** Libera as features para admin/produção/consultor e devolve um admin autenticado. */
export async function autenticarAdmin(
  app: INestApplication,
  features: string[] = FEATURES_USUARIO_CLIENTE,
) {
  const prisma = app.get(PrismaService);
  for (const feature of features) {
    await liberarFeature(prisma, feature, [Role.ADMIN, Role.PRODUCAO, Role.CONSULTOR]);
  }
  return criarUsuarioAutenticado(app, Role.ADMIN);
}

/** Libera as features só para recepção (papel fora do @Roles) e devolve o token dela. */
export async function autenticarPapelSemAcesso(app: INestApplication) {
  const prisma = app.get(PrismaService);
  for (const feature of FEATURES_USUARIO_CLIENTE) {
    await liberarFeature(prisma, feature, [Role.RECEPCAO]);
  }
  return criarUsuarioAutenticado(app, Role.RECEPCAO);
}

/** Cliente principal (tabela users), dono dos subordinados. */
export async function criarCliente(app: INestApplication) {
  const { usuario } = await criarUsuarioAutenticado(app, Role.CLIENTE);
  return usuario;
}

/** Subordinado (tabela users_cliente) do cliente informado. */
export function criarSubordinado(
  prisma: PrismaService,
  clienteId: bigint,
  dados: { nome?: string; documento?: string } = {},
) {
  sequencia += 1;
  return prisma.userCliente.create({
    data: {
      clienteId,
      email: `sub${sequencia}@e2e.test`,
      nome: dados.nome ?? `Subordinado ${sequencia}`,
      documento: dados.documento ?? null,
      senha: 'nao-usada-no-e2e',
    },
  });
}
