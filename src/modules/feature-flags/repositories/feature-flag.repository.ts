import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/shared/prisma/prisma.service';

@Injectable()
export class FeatureFlagRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.featureFlag.findMany({ orderBy: { key: 'asc' } });
  }

  findById(id: bigint) {
    return this.prisma.featureFlag.findUnique({ where: { id } });
  }

  findByKey(key: string) {
    return this.prisma.featureFlag.findUnique({ where: { key } });
  }

  create(data: Prisma.FeatureFlagCreateInput) {
    return this.prisma.featureFlag.create({ data });
  }

  update(id: bigint, data: Prisma.FeatureFlagUpdateInput) {
    return this.prisma.featureFlag.update({ where: { id }, data });
  }

  delete(id: bigint) {
    return this.prisma.featureFlag.delete({ where: { id } });
  }

  countUsuariosVinculados(id: bigint) {
    return this.prisma.userFeatureFlag.count({ where: { featureFlagId: id } });
  }
}
