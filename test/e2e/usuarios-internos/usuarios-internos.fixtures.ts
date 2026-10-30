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
import { buscarOuCriarPapel, criarUsuarioAutenticado } from '../helpers/criar-usuario-autenticado';
import { liberarFeature } from '../helpers/liberar-feature';

/** Dados e atalhos compartilhados pelos e2e de usuarios-internos (um arquivo por endpoint). */

export const ROTA_USUARIOS_INTERNOS = `${PREFIXO_API}/usuarios-internos`;

/** Libera gerenciar_usuarios_internos para admin e devolve um admin autenticado. */
export async function autenticarAdmin(app: INestApplication) {
  await liberarFeature(app.get(PrismaService), Feature.GERENCIAR_USUARIOS_INTERNOS, [Role.ADMIN]);
  return criarUsuarioAutenticado(app, Role.ADMIN);
}

/** Libera a feature para consultor (papel fora do @Roles) e devolve o token dele. */
export async function autenticarPapelSemAcesso(app: INestApplication) {
  await liberarFeature(app.get(PrismaService), Feature.GERENCIAR_USUARIOS_INTERNOS, [
    Role.CONSULTOR,
  ]);
  return criarUsuarioAutenticado(app, Role.CONSULTOR);
}

/** Admin sem a feature gerenciar_usuarios_internos liberada. */
export function autenticarSemFeature(app: INestApplication) {
  return criarUsuarioAutenticado(app, Role.ADMIN);
}

/** Usuário com papel(is) ativo(s) em role_user, sem token. */
export async function criarUsuarioComPapeis(app: INestApplication, papeis: string[]) {
  const prisma = app.get(PrismaService);
  const { usuario } = await criarUsuarioAutenticado(app, papeis[0]);
  for (const papel of papeis.slice(1)) {
    const papelCadastrado = await buscarOuCriarPapel(prisma, papel);
    await prisma.$executeRaw`
      INSERT INTO role_user (user_id, role_id, ativo) VALUES (${usuario.id}, ${papelCadastrado.id}, true)
    `;
  }
  return usuario;
}
