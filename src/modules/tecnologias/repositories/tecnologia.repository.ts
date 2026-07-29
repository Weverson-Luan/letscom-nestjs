import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/shared/prisma/prisma.service';

/** Mapeia sort_by (snake) para campos do Prisma; default createdAt. */
const SORT_MAP: Record<string, string> = {
  created_at: 'createdAt',
  updated_at: 'updatedAt',
  nome: 'nome',
  descricao: 'descricao',
  ativo: 'ativo',
  id: 'id',
};

@Injectable()
export class TecnologiaRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: bigint) {
    return this.prisma.tecnologia.findUnique({ where: { id } });
  }

  findByNome(nome: string) {
    return this.prisma.tecnologia.findUnique({ where: { nome } });
  }

  async paginate(params: {
    search?: string;
    sortBy?: string;
    order?: 'asc' | 'desc';
    skip: number;
    take: number;
  }) {
    const where: Prisma.TecnologiaWhereInput = {};
    if (params.search) {
      where.nome = { contains: params.search };
    }

    const sortField = SORT_MAP[params.sortBy ?? 'created_at'] ?? 'createdAt';
    const orderBy = { [sortField]: params.order ?? 'desc' };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.tecnologia.findMany({
        where,
        orderBy,
        skip: params.skip,
        take: params.take,
      }),
      this.prisma.tecnologia.count({ where }),
    ]);

    return { data, total };
  }

  create(data: Prisma.TecnologiaCreateInput) {
    return this.prisma.tecnologia.create({ data });
  }

  update(id: bigint, data: Prisma.TecnologiaUpdateInput) {
    return this.prisma.tecnologia.update({ where: { id }, data });
  }

  delete(id: bigint) {
    return this.prisma.tecnologia.delete({ where: { id } });
  }
}
