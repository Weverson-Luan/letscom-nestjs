import { FeatureFlag } from '@prisma/client';

/** Espelha o FeatureFlagsResponseHelper::mapFeatureFlag. */
export function mapFeatureFlag(flag: FeatureFlag) {
  return {
    id: flag.id,
    key: flag.key,
    nome: flag.nome,
    descricao: flag.descricao,
    tipo_usuario: flag.tipoUsuario,
    ativo: flag.ativo,
    created_at: flag.createdAt,
    updated_at: flag.updatedAt,
  };
}
