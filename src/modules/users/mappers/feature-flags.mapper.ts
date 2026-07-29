/** Espelha o FeatureFlagsResponseHelper (map de feature flags por usuário). */

export function mapUserFeatureFlag(flag: any) {
  return {
    id: flag.id,
    key: flag.key,
    nome: flag.nome,
    descricao: flag.descricao,
    tipo_usuario: flag.tipoUsuario ?? null,
    ativo: flag.ativo,
    created_at: flag.createdAt ?? null,
    updated_at: flag.updatedAt ?? null,
    pivot_ativo: Boolean(flag.pivotAtivo),
  };
}

export function mapUserFeatureFlags(flags: any[]) {
  return flags.map(mapUserFeatureFlag);
}

export function mapUserFeatureFlagsPayload(user: { id: bigint; nome: string | null }, flags: any[]) {
  return {
    user: { id: user.id, nome: user.nome },
    flags: mapUserFeatureFlags(flags),
  };
}

export function mapEnabledKeys(keys: string[]) {
  return { features: keys };
}
