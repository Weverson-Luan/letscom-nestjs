import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/shared/prisma/prisma.service';

const SORT_MAP: Record<string, string> = {
  created_at: 'createdAt',
  updated_at: 'updatedAt',
  nome: 'nome',
  ordem: 'ordem',
  id: 'id',
};

@Injectable()
export class CamposVariaveisRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: bigint) {
    return this.prisma.modeloTecnicoCampoVariavel.findUnique({ where: { id } });
  }

  async paginate(params: {
    search?: string;
    sortBy?: string;
    order?: 'asc' | 'desc';
    skip: number;
    take: number;
  }) {
    const where: Prisma.ModeloTecnicoCampoVariavelWhereInput = {};
    if (params.search) where.nome = { contains: params.search };

    const sortField = SORT_MAP[params.sortBy ?? 'ordem'] ?? 'ordem';
    const orderBy = { [sortField]: params.order ?? 'asc' };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.modeloTecnicoCampoVariavel.findMany({
        where,
        orderBy,
        skip: params.skip,
        take: params.take,
      }),
      this.prisma.modeloTecnicoCampoVariavel.count({ where }),
    ]);

    return { data, total };
  }

  listByModelo(modeloTecnicoId: bigint) {
    return this.prisma.modeloTecnicoCampoVariavel.findMany({
      where: { modeloTecnicoId },
      orderBy: { ordem: 'asc' },
    });
  }

  create(data: Prisma.ModeloTecnicoCampoVariavelCreateInput) {
    return this.prisma.modeloTecnicoCampoVariavel.create({ data });
  }

  update(id: bigint, data: Prisma.ModeloTecnicoCampoVariavelUpdateInput) {
    return this.prisma.modeloTecnicoCampoVariavel.update({ where: { id }, data });
  }

  delete(id: bigint) {
    return this.prisma.modeloTecnicoCampoVariavel.delete({ where: { id } });
  }

  deleteMany(modeloTecnicoId: bigint, exceptIds: bigint[] = []) {
    return this.prisma.modeloTecnicoCampoVariavel.deleteMany({
      where: {
        modeloTecnicoId,
        ...(exceptIds.length > 0 ? { id: { notIn: exceptIds } } : {}),
      },
    });
  }

  async maxOrdem(modeloTecnicoId: bigint): Promise<number> {
    const agg = await this.prisma.modeloTecnicoCampoVariavel.aggregate({
      where: { modeloTecnicoId },
      _max: { ordem: true },
    });
    return agg._max.ordem ?? 0;
  }
}
