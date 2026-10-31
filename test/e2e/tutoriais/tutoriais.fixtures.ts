/**
 * IMPORTS
 */
import { INestApplication } from '@nestjs/common';

// shared / roles
import { Role } from 'src/shared/constants/roles';

// helpers e2e (prefixo da API e autenticação)
import { PREFIXO_API } from '../helpers/criar-app-e2e';
import { criarUsuarioAutenticado } from '../helpers/criar-usuario-autenticado';

export const ROTA_VIDEOS_TUTORIAIS = `${PREFIXO_API}/videos-tutorias`;

/** Storage falso: o e2e não depende do bucket nem de arquivo real. */
export function criarStorageFalso() {
  return {
    exists: jest.fn().mockResolvedValue(true),
    getSignedUrl: jest.fn().mockResolvedValue('https://storage.e2e.test/video-assinado'),
  };
}

/** Qualquer papel tem acesso à rota; usa cliente para cobrir o caso do portal. */
export function autenticarCliente(app: INestApplication) {
  return criarUsuarioAutenticado(app, Role.CLIENTE);
}

/** Usuário sem nenhum papel: o RolesGuard responde 403. */
export function autenticarSemPapel(app: INestApplication) {
  return criarUsuarioAutenticado(app);
}
