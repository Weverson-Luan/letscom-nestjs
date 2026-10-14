import { PrismaService } from 'src/shared/prisma/prisma.service';

/**
 * Ativa a feature flag `key` para os papéis informados (coluna feature_flags.tipo_usuario),
 * que é o que o FeaturesGuard consulta.
 */
export function liberarFeature(prisma: PrismaService, key: string, papeis: string[]) {
  return prisma.featureFlag.create({
    data: { key, nome: key, tipoUsuario: papeis.join(','), ativo: true },
  });
}
