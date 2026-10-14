import { Role } from 'src/shared/constants/roles';

/** Papéis gerenciáveis pelo backoffice como "usuários internos" (valores de roles.nome). */
export const PAPEIS_INTERNOS = [
  `${Role.CONSULTOR}`,
  `${Role.PRODUCAO}`,
  `${Role.RECEPCAO}`,
] as const satisfies readonly `${Role}`[];

export type PapelInterno = (typeof PAPEIS_INTERNOS)[number];
