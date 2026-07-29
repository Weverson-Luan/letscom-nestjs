/**
 * Papéis (roles) do sistema — espelham os valores usados no CheckRole do Laravel
 * (coluna `nome` da tabela `roles`).
 */
export enum Role {
  ADMIN = 'admin',
  PRODUCAO = 'producao',
  CONSULTOR = 'consultor',
  CLIENTE = 'cliente',
  SUBORDINADO = 'subordinado',
  RECEPCAO = 'recepcao',
  EXPEDICAO = 'expedicao',
}

export const ALL_ROLES: Role[] = Object.values(Role);

/**
 * Tipos de usuário aceitos em feature flags (FeatureFlag::TIPOS_USUARIO).
 */
export const TIPOS_USUARIO_FEATURE_FLAG = [
  'admin',
  'producao',
  'consultor',
  'cliente',
  'subordinado',
  'recepcao',
  'expedicao',
] as const;
