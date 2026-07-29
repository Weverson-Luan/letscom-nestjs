import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/shared/prisma/prisma.service';

@Injectable()
export class UserFeatureFlagRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listarPorUsuario(userId: bigint) {
    const pivots = await this.prisma.userFeatureFlag.findMany({
      where: { userId },
      include: { featureFlag: true },
      orderBy: { featureFlag: { key: 'asc' } },
    });
    return pivots.map((p) => ({ ...p.featureFlag, pivotAtivo: p.ativo }));
  }

  /** Sincroniza (sync do Laravel): substitui o conjunto de flags do usuário. */
  async sincronizar(userId: bigint, flags: { feature_flag_id: number; ativo: boolean }[]) {
    await this.prisma.$transaction(async (tx) => {
      await tx.userFeatureFlag.deleteMany({ where: { userId } });
      if (flags.length > 0) {
        await tx.userFeatureFlag.createMany({
          data: flags.map((f) => ({
            userId,
            featureFlagId: BigInt(f.feature_flag_id),
            ativo: f.ativo,
          })),
        });
      }
    });
  }

  async listarKeysHabilitadas(userId: bigint): Promise<string[]> {
    const pivots = await this.prisma.userFeatureFlag.findMany({
      where: { userId, ativo: true, featureFlag: { ativo: true } },
      include: { featureFlag: true },
      orderBy: { featureFlag: { key: 'asc' } },
    });
    return pivots.map((p) => p.featureFlag.key);
  }
}
