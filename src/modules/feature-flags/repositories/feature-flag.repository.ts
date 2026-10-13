import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/shared/prisma/prisma.service';

/** sort_by aceitos (ListQueryParameters do Laravel); default `key`. */
const SORT_MAP: Record<string, string> = {
  id: 'id',
  key: 'key',
  nome: 'nome',
  ativo: 'ativo',
  created_at: 'createdAt',
  updated_at: 'updatedAt',
};

@Injectable()
export class FeatureFlagRepository {
  constructor(private readonly prisma: PrismaService) {}

  async paginate(params: {
    search?: string;
    ativo?: boolean;
    sortBy: string;
    order: 'asc' | 'desc';
    skip: number;
    take: number;
  }) {
    const where: Prisma.FeatureFlagWhereInput = {};
    if (params.search) {
      where.OR = [
        { key: { contains: params.search } },
        { nome: { contains: params.search } },
        { descricao: { contains: params.search } },
      ];
    }
    if (params.ativo !== undefined) {
      where.ativo = params.ativo;
    }

    const sortField = SORT_MAP[params.sortBy] ?? 'key';

    const [data, total] = await this.prisma.$transaction([
      this.prisma.featureFlag.findMany({
        where,
        orderBy: { [sortField]: params.order },
        skip: params.skip,
        take: params.take,
      }),
      this.prisma.featureFlag.count({ where }),
    ]);

    return { data, total };
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
}
