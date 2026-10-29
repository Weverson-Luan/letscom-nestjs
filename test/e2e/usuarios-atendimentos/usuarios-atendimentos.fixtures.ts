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

/** Dados e atalhos compartilhados pelos e2e de usuarios-atendimentos (um arquivo por endpoint). */

/** A rota segue 'users-atendimentos' (contrato com o front). */
export const ROTA_USUARIOS_ATENDIMENTOS = `${PREFIXO_API}/users-atendimentos`;

let sequencia = 0;

/** Libera acessar_admin para admin e devolve um admin autenticado. */
export async function autenticarAdmin(app: INestApplication) {
  await liberarFeature(app.get(PrismaService), Feature.ACESSAR_ADMIN, [Role.ADMIN]);
  return criarUsuarioAutenticado(app, Role.ADMIN);
}

/** Libera acessar_admin só para admin e devolve um consultor (sem a feature). */
export async function autenticarSemFeature(app: INestApplication) {
  await liberarFeature(app.get(PrismaService), Feature.ACESSAR_ADMIN, [Role.ADMIN]);
  return criarUsuarioAutenticado(app, Role.CONSULTOR);
}

/** Usuário (tabela users) dono dos atendimentos. */
export async function criarUsuarioDono(app: INestApplication) {
  const { usuario } = await criarUsuarioAutenticado(app, Role.CLIENTE);
  return usuario;
}

/** Usuário de atendimento (tabela users_atendimentos) do usuário informado. */
export function criarUsuarioAtendimento(
  prisma: PrismaService,
  usuarioId: bigint,
  dados: { nome?: string } = {},
) {
  sequencia += 1;
  return prisma.userAtendimento.create({
    data: {
      userId: usuarioId,
      nome: dados.nome ?? `Atendente ${sequencia}`,
      email: `atendimento${sequencia}@e2e.test`,
      telefone: `1170000${String(sequencia).padStart(4, '0')}`,
    },
  });
}
